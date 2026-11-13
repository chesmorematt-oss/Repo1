import {
  getLocalSitePlanUrl,
  handleLocalApiFallback,
  localUploadSitePlan,
} from './localBackendFallback';

let usingLocalFallback = false;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function runFallback<T>(path: string, options: RequestInit): Promise<T> {
  usingLocalFallback = true;
  const fb = await handleLocalApiFallback<T>(path, options);
  if (fb.status >= 400) {
    const errObj = fb.data as unknown as { error?: string };
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

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    return runFallback<T>(path, options);
  }

  if (res.headers.get('x-indeecheck-server') !== '1') {
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
  if (usingLocalFallback) {
    const localRes = await localUploadSitePlan(projectId, file, meta);
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

  let res: Response;
  try {
    res = await fetch(`/api/projects/${projectId}/site-plans?${params.toString()}`, {
      method: 'POST',
      headers,
      body: file,
    });
  } catch {
    usingLocalFallback = true;
    const localRes = await localUploadSitePlan(projectId, file, meta);
    return localRes as unknown as T;
  }

  if (res.headers.get('x-indeecheck-server') !== '1') {
    usingLocalFallback = true;
    const localRes = await localUploadSitePlan(projectId, file, meta);
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
  const qs = params.toString();
  return `/api/site-plans/${sitePlanId}/file${qs ? `?${qs}` : ''}`;
}
