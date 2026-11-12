import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EquationDialog, type EquationValue } from '../components/EquationDialog'
import { NoteBody } from '../components/NoteBody'
import { SYMBOLS, SymbolPad, type SymbolKey } from '../components/SymbolPad'
import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import { insertAt } from '../lib/noteMath'
import type { Note } from '../lib/types'

type DialogState = { initial: EquationValue; range: [number, number]; editing: boolean } | null

function formatEquation({ src, block }: EquationValue, before: string): string {
  if (!block) return `$${src}$`
  const lead = before === '' || before.endsWith('\n') ? '' : '\n'
  return `${lead}$$\n${src}\n$$\n`
}

export function Notes() {
  const { data, reload } = useApi<{ items: Note[] }>('/notes')
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Partial<Note> | null>(
    params.get('modul') ? { module_id: params.get('modul'), title: '', body: '' } : null,
  )
  const [dialog, setDialog] = useState<DialogState>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const body = editing?.body ?? ''
  const setBody = (value: string, caret?: number) => {
    setEditing((e) => (e ? { ...e, body: value } : e))
    if (caret !== undefined)
      requestAnimationFrame(() => {
        bodyRef.current?.focus()
        bodyRef.current?.setSelectionRange(caret, caret)
      })
  }

  const selection = (): [number, number] => {
    const el = bodyRef.current
    return [el?.selectionStart ?? body.length, el?.selectionEnd ?? body.length]
  }

  const insertSymbol = (k: SymbolKey) => {
    const [s, e] = selection()
    const r = insertAt(body, s, e, k.text, k.caret)
    setBody(r.value, r.caret)
  }

  const openNewEquation = (initial: EquationValue) => {
    const [s, e] = selection()
    const selected = body.slice(s, e)
    setDialog({ initial: selected.trim() ? { ...initial, src: selected } : initial, range: [s, e], editing: false })
  }

  const applyEquation = (v: EquationValue | null) => {
    if (!dialog) return
    const [s, e] = dialog.range
    const text = v ? formatEquation(v, body.slice(0, s)) : ''
    const r = insertAt(body, s, e, text)
    setDialog(null)
    setBody(r.value, r.caret)
  }

  const save = async () => {
    if (!editing) return
    const payload = { module_id: editing.module_id ?? null, title: editing.title ?? '', body: editing.body ?? '' }
    if (editing.id) await api(`/notes/${editing.id}`, { method: 'PATCH', body: payload })
    else await api('/notes', { method: 'POST', body: payload })
    setEditing(null)
    void reload()
  }

  const remove = async (id: string) => {
    await api(`/notes/${id}`, { method: 'DELETE' })
    setEditing(null)
    void reload()
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="page-title">Catatanku</h1>
      <p className="page-sub">Tulis dengan kata-katamu sendiri. Catatan ini hanya bisa dilihat olehmu.</p>
      {editing ? (
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <div className="field">
            <label htmlFor="nt">Judul</label>
            <input id="nt" value={editing.title ?? ''} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="nb">Isi catatan {editing.module_id ? `(modul ${editing.module_id})` : ''}</label>
            <div className="eq-toolbar" role="toolbar" aria-label="Alat persamaan">
              <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={() => openNewEquation({ src: '', block: false })}>
                ∑ Persamaan
              </button>
              <button
                type="button"
                className="btn small ghost"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openNewEquation({ src: '2x + y = 7\nx − y = 2', block: true })}
              >
                {'{'} Sistem
              </button>
              <SymbolPad keys={SYMBOLS} onKey={insertSymbol} />
            </div>
            <textarea
              id="nb"
              ref={bodyRef}
              value={body}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
                  e.preventDefault()
                  openNewEquation({ src: '', block: false })
                }
              }}
              placeholder="Contoh: Eliminasi artinya menghilangkan. $2x + y = 7$"
              style={{ minHeight: 180, fontVariantNumeric: 'tabular-nums' }}
            />
            <small className="muted">
              Persamaan ditulis di antara tanda <code>$</code>, misalnya <code>$x + y = 5$</code>. Pintasan: Ctrl+M.
            </small>
          </div>

          {body.trim() && (
            <div className="note-preview" aria-label="Pratinjau catatan">
              <small className="muted">Pratinjau · ketuk persamaan untuk mengubahnya</small>
              <NoteBody
                body={body}
                onEditMath={(seg) => setDialog({ initial: { src: seg.src, block: seg.block }, range: [seg.start, seg.end], editing: true })}
              />
            </div>
          )}

          <div className="step-actions">
            {editing.id && (
              <button className="link-btn" style={{ color: 'var(--error)' }} onClick={() => void remove(editing.id!)}>
                Hapus catatan
              </button>
            )}
            <span className="spacer" />
            <button className="btn ghost" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button className="btn" onClick={() => void save()} disabled={!editing.title?.trim() && !editing.body?.trim()}>
              Simpan
            </button>
          </div>
        </section>
      ) : (
        <button className="btn" onClick={() => setEditing({ title: '', body: '' })} style={{ marginBottom: 16 }}>
          + Catatan baru
        </button>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {data?.items.length === 0 && <p className="empty">Belum ada catatan.</p>}
        {data?.items.map((n) => (
          <button key={n.id} className="card note-card" style={{ textAlign: 'left' }} onClick={() => setEditing(n)}>
            <b>{n.title || 'Tanpa judul'}</b>
            {n.module_id && <span className="badge" style={{ marginLeft: 8 }}>{n.module_id}</span>}
            <div className="note-card-body">
              <NoteBody body={n.body} />
            </div>
          </button>
        ))}
      </div>

      {dialog && (
        <EquationDialog
          initial={dialog.initial}
          editing={dialog.editing}
          onSave={applyEquation}
          onDelete={() => applyEquation(null)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
