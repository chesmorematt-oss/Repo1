import {
  getLocalSitePlanUrl,
  handleLocalApiFallback,
  localUploadSitePlan,
} from './localBackendFallback';

const TOKEN_STORAGE_KEY = 'indeecheck_token';

// Keep an in-memory copy alongside localStorage & sessionStorage so auth works
// even in browsers/iframes that block third-party storage.
let memoryToken: string | null = null;
let usingLocalFallback = false;

export function isUsingLocalFallback(): boolean {
  return usingLocalFallback;
}

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const fromLocal = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromLocal) {
      memoryToken = fromLocal;
      return fromLocal;
    }
  } catch {
    // ignore storage errors
  }
  try {
    const fromSession = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromSession) {
      memoryToken = fromSession;
      return fromSession;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setStoredToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function runFallback<T>(path: string, options: RequestInit): Promise<T> {
  usingLocalFallback = true;
  const currentToken = getStoredToken();
  const fb = await handleLocalApiFallback<T>(path, options, currentToken);
  if (fb.status >= 400) {
    const errObj = fb.data as unknown as { error?: string };
    if (fb.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('indeecheck:unauthorized'));
    }
    throw new ApiError(
      String(errObj?.error || `Request failed with status ${fb.status}`),
      fb.status
    );
  }
  return fb.data;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  // If we already hold a local-fallback token, route through local store unless logging in fresh
  if (usingLocalFallback && token?.startsWith('local-jwt-') && !path.startsWith('/api/auth/login')) {
    return runFallback<T>(path, options);
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    // Network unreachable (offline Desktop App or paused cloud sandbox) -> seamless local fallback
    return runFallback<T>(path, options);
  }

  const fromIndeeCheckServer = res.headers.get('x-indeecheck-server') === '1';

  // If the response did NOT originate from our Express backend (for example, an upstream
  // cloud preview proxy intercepted the XHR/fetch with "Cannot authenticate user" because
  // third-party cookies were blocked or the app was launched in a standalone Desktop window),
  // seamlessly handle the request via the built-in browser persistence engine!
  if (!fromIndeeCheckServer) {
    return runFallback<T>(path, options);
  }

  usingLocalFallback = false;

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('indeecheck:unauthorized'));
    }
    throw new ApiError(
      String(data.error || `Request failed with status ${res.status}`),
      res.status
    );
  }

  return data as unknown as T;
}

export async function uploadSitePlanFile<T>(
  projectId: number,
  file: File,
  meta: {
    title?: string;
    plan_type?: string;
    revision_label?: string;
    notes?: string;
  } = {}
): Promise<T> {
  const token = getStoredToken();
  if (usingLocalFallback) {
    const localRes = await localUploadSitePlan(projectId, file, meta, token);
    return localRes as unknown as T;
  }

  const params = new URLSearchParams();
  params.set('filename', file.name || 'site-plan.pdf');
  if (file.type) params.set('mime_type', file.type);
  if (meta.title) params.set('title', meta.title);
  if (meta.plan_type) params.set('plan_type', meta.plan_type);
  if (meta.revision_label) params.set('revision_label', meta.revision_label);
  if (meta.notes) params.set('notes', meta.notes);

  const headers = new Headers();
  headers.set('Content-Type', file.type || 'application/octet-stream');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`/api/projects/${projectId}/site-plans?${params.toString()}`, {
      method: 'POST',
      headers,
      body: file,
      credentials: 'include',
    });
  } catch {
    usingLocalFallback = true;
    const localRes = await localUploadSitePlan(projectId, file, meta, token);
    return localRes as unknown as T;
  }

  if (res.headers.get('x-indeecheck-server') !== '1') {
    usingLocalFallback = true;
    const localRes = await localUploadSitePlan(projectId, file, meta, token);
    return localRes as unknown as T;
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('indeecheck:unauthorized'));
    }
    throw new ApiError(
      String(data.error || `Upload failed with status ${res.status}`),
      res.status
    );
  }

  return data as unknown as T;
}

export function getSitePlanFileUrl(sitePlanId: number, download = false): string {
  if (usingLocalFallback) {
    const localUrl = getLocalSitePlanUrl(sitePlanId);
    if (localUrl) return localUrl;
  }
  const params = new URLSearchParams();
  if (download) params.set('download', '1');
  const token = getStoredToken();
  if (token) params.set('token', token);
  const qs = params.toString();
  return `/api/site-plans/${sitePlanId}/file${qs ? `?${qs}` : ''}`;
}
