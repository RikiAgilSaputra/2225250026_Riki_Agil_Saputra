import { useEffect, useRef, useState } from 'react'
import { insertAt } from '../lib/noteMath'
import { MathRender } from './MathRender'
import { STRUCTURES, SYMBOLS, SymbolPad, type SymbolKey } from './SymbolPad'

export interface EquationValue {
  src: string
  block: boolean
}

const TEMPLATES: { label: string; value: EquationValue }[] = [
  { label: 'Persamaan', value: { src: '2x + y = 7', block: false } },
  { label: 'Sistem 2 persamaan', value: { src: '2x + y = 7\nx − y = 2', block: true } },
  { label: 'Pecahan', value: { src: '(x + 1)/2 = 3', block: false } },
  { label: 'Titik potong', value: { src: '(x, y) = (3, 1)', block: false } },
]

/** Equation editor with symbol pad and live preview (US-22). */
export function EquationDialog({
  initial,
  editing,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EquationValue
  editing: boolean
  onSave: (v: EquationValue) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [src, setSrc] = useState(initial.src)
  const [block, setBlock] = useState(initial.block)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.setSelectionRange(src.length, src.length)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const press = (k: SymbolKey) => {
    const el = ref.current
    const start = el?.selectionStart ?? src.length
    const end = el?.selectionEnd ?? src.length
    const r = insertAt(src, start, end, k.text, k.caret)
    setSrc(r.value)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(r.caret, r.caret)
    })
  }

  const multiLine = src.includes('\n')
  const save = () => src.trim() && onSave({ src: src.trim(), block: block || multiLine })

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal eq-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Ubah persamaan' : 'Tambah persamaan'}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
        }}
      >
        <h2 style={{ fontSize: '1.2rem' }}>{editing ? 'Ubah persamaan' : 'Tambah persamaan'}</h2>

        {!editing && (
          <div className="eq-templates">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                className="chip"
                onClick={() => {
                  setSrc(t.value.src)
                  setBlock(t.value.block)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="eq-src">Tulis persamaan (Enter = baris baru untuk sistem)</label>
          <textarea
            id="eq-src"
            ref={ref}
            className="eq-input"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            rows={multiLine ? 3 : 2}
            spellCheck={false}
            autoCapitalize="off"
          />
        </div>

        <SymbolPad keys={SYMBOLS} onKey={press} />
        <SymbolPad keys={STRUCTURES} onKey={press} />

        <div className="eq-preview" aria-live="polite">
          <small className="muted">Pratinjau</small>
          <div>{src.trim() ? <MathRender src={src.trim()} block={block || multiLine} /> : <span className="muted">—</span>}</div>
        </div>

        <label className="switch" style={{ paddingTop: 0 }}>
          Tampilkan di baris sendiri
          <input type="checkbox" checked={block || multiLine} disabled={multiLine} onChange={(e) => setBlock(e.target.checked)} />
        </label>

        <p className="muted" style={{ fontSize: '0.82rem' }}>
          Ketik cepat: <code>{'<='}</code> jadi ≤, <code>^2</code> jadi pangkat, <code>a/b</code> jadi pecahan.
        </p>

        <div className="step-actions">
          {editing && onDelete && (
            <button type="button" className="link-btn" style={{ color: 'var(--error)' }} onClick={onDelete}>
              Hapus persamaan
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn" disabled={!src.trim()} onClick={save}>
            {editing ? 'Simpan' : 'Sisipkan'}
          </button>
        </div>
      </div>
    </div>
  )
}
