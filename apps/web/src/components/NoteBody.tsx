import { parseNote, type NoteSegment } from '../lib/noteMath'
import { MathRender } from './MathRender'

/** Renders a note: plain text keeps its line breaks, $…$ and $$…$$ become equations. */
export function NoteBody({
  body,
  onEditMath,
}: {
  body: string
  /** When given, equations are clickable so the student can edit them. */
  onEditMath?: (seg: Extract<NoteSegment, { kind: 'math' }>) => void
}) {
  return (
    <div className="note-body">
      {parseNote(body).map((seg, i, all) => {
        if (seg.kind === 'text') {
          // A block equation already sits on its own line: drop the line breaks around it.
          let text = seg.text
          if (all[i - 1]?.kind === 'math' && (all[i - 1] as { block: boolean }).block) text = text.replace(/^\n/, '')
          if (all[i + 1]?.kind === 'math' && (all[i + 1] as { block: boolean }).block) text = text.replace(/\n$/, '')
          return text ? <span key={seg.start}>{text}</span> : null
        }
        const eq = <MathRender src={seg.src} block={seg.block} />
        return onEditMath ? (
          <button
            key={seg.start}
            type="button"
            className={`m-edit${seg.block ? ' m-edit-block' : ''}`}
            title="Ketuk untuk mengubah persamaan"
            onClick={() => onEditMath(seg)}
          >
            {eq}
          </button>
        ) : (
          <span key={seg.start} className={seg.block ? 'm-block-wrap' : undefined}>
            {eq}
          </span>
        )
      })}
    </div>
  )
}
