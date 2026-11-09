import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useApi } from '../lib/hooks'
import type { Note } from '../lib/types'

export function Notes() {
  const { data, reload } = useApi<{ items: Note[] }>('/notes')
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Partial<Note> | null>(params.get('modul') ? { module_id: params.get('modul'), title: '', body: '' } : null)

  const save = async () => {
    if (!editing) return
    const body = { module_id: editing.module_id ?? null, title: editing.title ?? '', body: editing.body ?? '' }
    if (editing.id) await api(`/notes/${editing.id}`, { method: 'PATCH', body })
    else await api('/notes', { method: 'POST', body })
    setEditing(null)
    void reload()
  }

  const remove = async (id: string) => {
    await api(`/notes/${id}`, { method: 'DELETE' })
    setEditing(null)
    void reload()
  }

  return (
    <div style={{ maxWidth: 820 }}>
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
            <textarea id="nb" value={editing.body ?? ''} maxLength={5000} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </div>
          <div className="step-actions">
            {editing.id && (
              <button className="link-btn" style={{ color: 'var(--error)' }} onClick={() => void remove(editing.id!)}>
                Hapus
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
          <button key={n.id} className="card" style={{ textAlign: 'left' }} onClick={() => setEditing(n)}>
            <b>{n.title || 'Tanpa judul'}</b>
            {n.module_id && <span className="badge" style={{ marginLeft: 8 }}>{n.module_id}</span>}
            <p className="muted" style={{ whiteSpace: 'pre-line', marginTop: 6 }}>
              {n.body.slice(0, 240)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
