import { useState } from 'react'
import { cognitiveInfo } from '../lib/cognitive'

/**
 * Names the cognitive function a screen or step trains (RMT, docs/15 §4).
 * The explanation stays folded so it adds no reading load until the student asks for it.
 */
export function CognitiveChip({ id }: { id?: string | null }) {
  const [open, setOpen] = useState(false)
  const info = cognitiveInfo(id)
  if (!info) return null
  return (
    <div className="cog">
      <button type="button" className="cog-chip" aria-expanded={open} onClick={() => setOpen(!open)}>
        🧠 {info.label}
      </button>
      {open && (
        <p className="cog-detail">
          {info.meaning} <i>Tanya dirimu: {info.question}</i>
        </p>
      )}
    </div>
  )
}
