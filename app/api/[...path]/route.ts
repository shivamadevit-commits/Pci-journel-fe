import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE, AT_COOKIE, ROLE_COOKIE, RT_COOKIE, clearOptions, cookieOptions, type TokenPair } from '@/lib/server/session';

/**
 * Same-origin proxy to the journal API.
 *  - attaches the bearer token from the httpOnly cookie
 *  - transparently refreshes (rotating refresh token, single-flight) and retries once
 *  - stores tokens from login responses in httpOnly cookies and strips them from the body
 * The backend remains the authority for every permission decision.
 */

type Ctx = { params: Promise<{ path: string[] }> };

const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'x-request-id', 'user-agent'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'content-length', 'cache-control', 'content-security-policy', 'retry-after', 'x-request-id', 'ratelimit', 'ratelimit-policy'];

const inflight = new Map<string, Promise<TokenPair | null>>();

async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  let p = inflight.get(refreshToken);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          cache: 'no-store',
        });
        if (!r.ok) return null;
        const j = (await r.json()) as { data?: TokenPair };
        return j.data ?? null;
      } catch {
        return null;
      }
    })().finally(() => setTimeout(() => inflight.delete(refreshToken), 10_000));
    inflight.set(refreshToken, p);
  }
  return p;
}

function setSession(res: NextResponse, pair: TokenPair, role?: string) {
  const exp = new Date(pair.refreshTokenExpiresAt);
  res.cookies.set(AT_COOKIE, pair.accessToken, cookieOptions(exp));
  res.cookies.set(RT_COOKIE, pair.refreshToken, cookieOptions(exp));
  if (role) res.cookies.set(ROLE_COOKIE, role, cookieOptions(exp));
}

function clearSession(res: NextResponse) {
  for (const n of [AT_COOKIE, RT_COOKIE, ROLE_COOKIE]) res.cookies.set(n, '', clearOptions);
}

function pickHeaders(src: Headers, names: string[]): Headers {
  const h = new Headers();
  for (const n of names) {
    const v = src.get(n);
    if (v) h.set(n, v);
  }
  return h;
}

/** Tokens live only in httpOnly cookies; they are removed from the JSON the browser receives. */
function stripTokens(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const k of ['accessToken', 'refreshToken', 'refreshTokenExpiresAt', 'tokenType', 'accessTokenExpiresIn']) delete out[k];
  return out;
}

async function handle(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const sub = path.join('/');

  // Refresh is internal; the browser must not handle raw tokens.
  if (sub === 'auth/refresh') return NextResponse.json({ success: false, message: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const url = `${API_BASE}/${sub}${req.nextUrl.search}`;
  const jar = await cookies();
  let at = jar.get(AT_COOKIE)?.value;
  const rt = jar.get(RT_COOKIE)?.value;
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;
  const baseHeaders = pickHeaders(req.headers, FORWARD_REQUEST_HEADERS);
  const isAuthPublic = sub.startsWith('auth/') && !['auth/logout', 'auth/me', 'auth/change-password'].includes(sub);

  const call = (token?: string) => {
    const headers = new Headers(baseHeaders);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(url, { method: req.method, headers, body, redirect: 'manual', cache: 'no-store' });
  };

  let refreshed: TokenPair | null = null;
  let sessionDead = false;

  if (!at && rt && !isAuthPublic) {
    refreshed = await refreshTokens(rt);
    if (refreshed) at = refreshed.accessToken;
    else sessionDead = true;
  }

  let upstream: Response;
  try {
    upstream = await call(isAuthPublic ? undefined : at);
  } catch {
    return NextResponse.json({ success: false, message: 'The server is unreachable. Please try again.', code: 'UPSTREAM_UNAVAILABLE' }, { status: 502 });
  }

  if (upstream.status === 401 && rt && !isAuthPublic && !refreshed && !sessionDead) {
    const j = (await upstream.clone().json().catch(() => null)) as { code?: string } | null;
    if (j?.code === 'TOKEN_EXPIRED' || j?.code === 'TOKEN_INVALID') {
      refreshed = await refreshTokens(rt);
      if (refreshed) upstream = await call(refreshed.accessToken);
      else sessionDead = true;
    }
  }

  const headers = pickHeaders(upstream.headers, FORWARD_RESPONSE_HEADERS);

  // Login responses: move tokens into cookies, never into the body.
  if ((sub === 'auth/login' || sub === 'auth/login/verify-otp') && upstream.ok) {
    const j = (await upstream.json()) as { success: boolean; message: string; data: Record<string, unknown> & { user?: { role: string } } };
    const res = NextResponse.json(
      { ...j, data: stripTokens(j.data) },
      { status: upstream.status },
    );
    if (typeof j.data.accessToken === 'string') setSession(res, j.data as unknown as TokenPair, j.data.user?.role);
    return res;
  }

  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
  // A 401 that survives the refresh attempt means the session is gone: drop the cookies so /login does not bounce back.
  if (sub === 'auth/logout' || sessionDead || (upstream.status === 401 && !isAuthPublic)) clearSession(res);
  else if (refreshed) setSession(res, refreshed);
  return res;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
