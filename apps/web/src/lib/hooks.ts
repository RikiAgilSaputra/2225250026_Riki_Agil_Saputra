import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'

/** Minimal data hook: load JSON from the API with loading/error state and reload(). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(Boolean(path))

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      setData(await api<T>(path))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'ERROR', 'Terjadi kesalahan.'))
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'manual'

/** PWA install: Chrome/Edge (Android, Windows, macOS) use the prompt; iOS needs Share → Add to Home Screen. */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const mode: InstallMode = standalone ? 'installed' : deferred ? 'prompt' : ios ? 'ios' : 'manual'
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    deferred = null
    force((n) => n + 1)
  }
  return { mode, install }
}
