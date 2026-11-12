/** Buttons for math symbols and structures. `text` is inserted; `caret` = cursor offset inside it. */
export interface SymbolKey {
  label: string
  text: string
  caret?: number
  name: string
  cls?: string
}

export const SYMBOLS: SymbolKey[] = [
  { label: 'x', text: 'x', name: 'x', cls: 'vx' },
  { label: 'y', text: 'y', name: 'y', cls: 'vy' },
  { label: '−', text: '−', name: 'kurang' },
  { label: '×', text: '×', name: 'kali' },
  { label: '÷', text: '÷', name: 'bagi' },
  { label: '=', text: '=', name: 'sama dengan' },
  { label: '≠', text: '≠', name: 'tidak sama dengan' },
  { label: '≤', text: '≤', name: 'kurang dari atau sama dengan' },
  { label: '≥', text: '≥', name: 'lebih dari atau sama dengan' },
  { label: '→', text: '→', name: 'panah' },
  { label: '⇒', text: '⇒', name: 'maka' },
  { label: '∴', text: '∴', name: 'jadi' },
  { label: 'π', text: 'π', name: 'pi' },
  { label: 'a²', text: '^2', name: 'kuadrat' },
]

export const STRUCTURES: SymbolKey[] = [
  { label: 'a/b', text: '()/()', caret: 1, name: 'pecahan' },
  { label: 'xⁿ', text: '^()', caret: 2, name: 'pangkat' },
  { label: 'x₁', text: '_()', caret: 2, name: 'indeks bawah' },
  { label: '√', text: '√()', caret: 2, name: 'akar' },
  { label: '( )', text: '()', caret: 1, name: 'kurung' },
  { label: '(x, y)', text: '(x, y)', name: 'titik' },
]

export function SymbolPad({ keys, onKey }: { keys: SymbolKey[]; onKey: (k: SymbolKey) => void }) {
  return (
    <div className="symbol-pad">
      {keys.map((k) => (
        <button
          key={k.name}
          type="button"
          className={k.cls}
          aria-label={k.name}
          title={k.name}
          // Keep focus (and the caret) in the text field
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKey(k)}
        >
          {k.label}
        </button>
      ))}
    </div>
  )
}
