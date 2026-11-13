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

// The free Render server sleeps when idle and needs up to ~1 minute to wake up; the Netlify proxy
// answers 502/503/504 meanwhile. Requests that are safe to repeat are retried with a short pause.
const WAKE_STATUSES = new Set([502, 503, 504])
const WAKE_RETRIES = 4
const WAKE_DELAY_MS = 5000
const RETRY_SAFE = (method: string, path: string) => method === 'GET' || path === '/auth/login'

const wakeListeners = new Set<(waking: boolean) => void>()
/** Lets the UI show "server sedang dinyalakan" while retries run. */
export const onServerWaking = (fn: (waking: boolean) => void) => {
  wakeListeners.add(fn)
  return () => {
    wakeListeners.delete(fn)
  }
}
const setWaking = (w: boolean) => wakeListeners.forEach((fn) => fn(w))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  let res!: Response // assigned on every loop iteration that reaches the break
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      })
    } catch {
      setWaking(false)
      throw new ApiError(0, 'OFFLINE', 'Tidak ada koneksi ke server. Periksa internetmu.')
    }
    if (WAKE_STATUSES.has(res.status) && attempt < WAKE_RETRIES && RETRY_SAFE(method, path)) {
      setWaking(true)
      await sleep(WAKE_DELAY_MS)
      continue
    }
    setWaking(false)
    break
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } }).error ?? {}
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    const fallback = WAKE_STATUSES.has(res.status)
      ? 'Server sedang dinyalakan. Tunggu sebentar lalu coba lagi.'
      : 'Terjadi kesalahan. Coba lagi.'
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? fallback)
  }
  return data as T
}
