import { isDemoMode } from "../demo/config";
import { demoApi } from "../demo/api";
import { ApiError } from "./api-error";

export { ApiError } from "./api-error";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode) return demoApi<T>(path, options);

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
  const token = localStorage.getItem("access_token");
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
