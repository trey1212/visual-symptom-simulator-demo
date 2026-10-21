// Thin fetch wrapper for the Go backend. Auth uses an HttpOnly session cookie,
// so requests just need to include credentials.

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.status === 204 ? (undefined as T) : res.json()
}
