const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
const TOKEN_KEY = 'langkahku.token'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

// v0.1 keeps only the access token in localStorage (no personal data). The
// production plan moves it to an httpOnly cookie / Secure Storage (docs/10 §6.1).
export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable: session-only login */
    }
  },
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'OFFLINE', 'Tidak ada koneksi ke server. Periksa internetmu.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } }).error ?? {}
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Terjadi kesalahan. Coba lagi.')
  }
  return data as T
}
