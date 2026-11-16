import { COGNITIVE, COGNITIVE_ORDER } from '../lib/cognitive'
import { Bar } from './ProgressRing'

/** Average step score per cognitive function (RMT profile, docs/15 §7). Unpractised functions show “–”. */
export function ThinkingBars({ profile }: { profile: Record<string, number | null> | undefined }) {
  return (
    <div className="bars">
      {COGNITIVE_ORDER.map((k) => {
        const v = profile?.[k] ?? null
        return (
          <div key={k} className="bar-row" title={COGNITIVE[k].meaning}>
            <span>{COGNITIVE[k].label}</span>
            <Bar value={v ?? 0} />
            <b>{v ?? '–'}</b>
          </div>
        )
      })}
    </div>
  )
}
