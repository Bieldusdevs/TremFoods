'use client';

/** Helper de cliente: CSRF (double-submit) + fetch tipado para a API. */

let csrfPromise: Promise<string> | null = null;

export function getCsrf(): Promise<string> {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.csrfToken as string);
  }
  return csrfPromise;
}

export type ApiResult<T = Record<string, never>> = { ok: boolean; status: number; data: T & { error?: { code: string; message: string } } };

async function mut<T = Record<string, never>>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = await getCsrf();
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-csrf-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function apiPost<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('POST', path, body);
}
export function apiPatch<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('PATCH', path, body);
}
export function apiDelete<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('DELETE', path, body);
}
export async function apiGet<T = Record<string, never>>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(path, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function emitCartChange() {
  window.dispatchEvent(new CustomEvent('basket:changed'));
}
