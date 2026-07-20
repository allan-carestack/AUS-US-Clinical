// Thin typed fetch wrapper. When `apiConfig.useMocks` is set, requests are
// routed to the in-memory mock router instead of the network.

import { apiConfig } from './config';
import { ApiError } from './types';
import { handleMock } from './mocks';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

// Auth is intentionally NOT handled here. The real carestack.clinical backend
// requires an identity token; wire it in via this hook (e.g. read from the app
// shell's auth context). Never hardcode a token in source.
function getAuthHeaders(): Record<string, string> {
  return {};
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';

  if (apiConfig.useMocks) {
    if (apiConfig.mockLatencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, apiConfig.mockLatencyMs));
    }
    return handleMock<T>(method, path, opts.body);
  }

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || res.statusText, res.status, path);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
