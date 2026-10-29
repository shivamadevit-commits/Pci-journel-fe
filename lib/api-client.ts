import type { ApiErrorBody, ApiResult, Envelope, FieldError } from '@/types/api';

/** Same-origin base: the Next.js route handler proxies to `${API_URL}/api/v1` and manages the session cookies. */
const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors: FieldError[] = [],
    public readonly requestId?: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isValidation() {
    return this.status === 400 && this.errors.length > 0;
  }
}

type Query = Record<string, string | number | boolean | null | undefined | Array<string | number>>;

export function buildQuery(query?: Query): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

let redirecting = false;
function sessionLost() {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Full navigation on purpose: discards all in-memory client state of the ended session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?next=${next}`;
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form; // browser sets the multipart boundary
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${buildQuery(opts.query)}`, { method, headers, body, signal: opts.signal, credentials: 'same-origin', cache: 'no-store' });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | ApiErrorBody | null;
  if (res.ok && json && json.success) return { data: json.data, meta: json.meta, message: json.message };

  const err = json && !json.success ? json : null;
  const retryAfter = Number(res.headers.get('retry-after')) || undefined;
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !path.startsWith('/auth/verify') && !path.startsWith('/auth/forgot') && !path.startsWith('/auth/reset')) {
    sessionLost();
  }
  throw new ApiError(
    res.status,
    err?.code ?? (res.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR'),
    err?.message ?? (res.status >= 500 ? 'Something went wrong on the server. Please try again.' : 'The request failed.'),
    err?.errors ?? [],
    err?.requestId,
    retryAfter,
  );
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** multipart/form-data upload */
  upload: <T>(method: 'POST' | 'PUT', path: string, form: FormData) => request<T>(method, path, { form }),
};

/** Downloads an authorised file through the proxy and triggers a browser save. */
export async function downloadFile(path: string, fallbackName = 'download'): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (res.status === 401) sessionLost();
    throw new ApiError(res.status, j?.code ?? 'HTTP_ERROR', j?.message ?? 'The file could not be downloaded.', [], j?.requestId);
  }
  const cd = res.headers.get('content-disposition') ?? '';
  const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? (err.status === 429 && err.retryAfter ? `${err.message} Try again in ${err.retryAfter}s.` : err.message) : err instanceof Error ? err.message : 'Something went wrong.';
