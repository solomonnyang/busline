import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.select({
  android: '10.0.2.2',
  web:
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== 'localhost'
      ? window.location.hostname
      : 'localhost',
  default: 'localhost',
});

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:8090/api`;

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Resolve an API-relative path (e.g. `/uploads/avatars/x.jpg`) into a fully
 * qualified URL using the current API base, so the same stored asset loads on
 * every platform regardless of how each one reaches the server.
 */
export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return path;
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string> | null;

  constructor(message: string, status: number, errors: Record<string, string> | null = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    throw new ApiError('Unable to reach the server. Check your connection.', 0);
  }

  let payload: { success?: boolean; message?: string; data?: unknown } | null = null;
  try {
    payload = await response.json();
  } catch (e) {
    payload = null;
  }

  if (response.status === 401 && authToken) {
    onUnauthorized?.();
  }

  if (!response.ok || payload?.success === false) {
    const errors =
      payload && payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, string>)
        : null;
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      errors
    );
  }

  return (payload?.data ?? payload) as T;
}

/**
 * Upload an image file (multipart/form-data) to the backend /upload endpoint.
 * The backend returns { url } which callers store on the entity.
 */
export async function uploadFile<T = { url: string }>(
  path: string,
  fileUri: string,
  mimeType = 'image/jpeg'
): Promise<T> {
  const name = fileUri.split('/').pop() || 'upload.jpg';
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name,
    type: mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: form,
    });
  } catch (e) {
    throw new ApiError('Unable to reach the server. Check your connection.', 0);
  }

  let payload: { success?: boolean; message?: string; data?: unknown } | null = null;
  try {
    payload = await response.json();
  } catch (e) {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Upload failed (${response.status})`,
      response.status
    );
  }

  return (payload?.data ?? payload) as T;
}
