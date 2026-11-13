import { useEffect, useState } from 'react'
import { onServerWaking } from '../lib/api'

/** Shown while the free Render server wakes up (first request after it has been idle). */
export function ServerWakeBanner() {
  const [waking, setWaking] = useState(false)
  useEffect(() => onServerWaking(setWaking), [])
  if (!waking) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      ⏳ Server sedang dinyalakan, tunggu sebentar…
    </div>
  )
}
