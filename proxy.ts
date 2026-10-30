import { NextResponse, type NextRequest } from 'next/server';
import { RT_COOKIE, ROLE_COOKIE } from '@/lib/server/session';

/**
 * Optimistic route guard (Next 16 "proxy"). It only checks that a session cookie exists and that the role-prefixed
 * area matches the role cookie, to avoid flashing screens. It is NOT a security boundary — the API enforces
 * authentication and authorisation on every request.
 */
const AREA_ROLES: Record<string, string[]> = {
  '/author': ['AUTHOR'],
  '/reviewer': ['REVIEWER'],
  '/production': ['PRODUCTION'],
  '/editor': ['EDITOR', 'ADMIN'],
  '/admin': ['ADMIN'],
};
const HOME: Record<string, string> = { AUTHOR: '/author', REVIEWER: '/reviewer', PRODUCTION: '/production', EDITOR: '/editor', ADMIN: '/admin' };
const SHARED = ['/notifications', '/profile'];
const GUEST_ONLY = ['/login', '/register'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(RT_COOKIE)?.value);
  const rawRole = req.cookies.get(ROLE_COOKIE)?.value;
  const role = rawRole === 'CHIEF_EDITOR_ADMIN' ? 'ADMIN' : rawRole; // cookie written before the role was renamed

  const area = Object.keys(AREA_ROLES).find((a) => pathname === a || pathname.startsWith(`${a}/`));
  const shared = SHARED.some((s) => pathname === s || pathname.startsWith(`${s}/`));

  if ((area || shared) && !hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (area && role && !AREA_ROLES[area]!.includes(role)) return NextResponse.redirect(new URL('/unauthorized', req.url));
  if (GUEST_ONLY.includes(pathname) && hasSession && role && HOME[role]) return NextResponse.redirect(new URL(HOME[role]!, req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
