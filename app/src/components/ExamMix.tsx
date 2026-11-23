import { SECTIONS } from '../lib/exam.ts'

/** The whole exam at a glance: 20 squares, coloured by the part of the pool they come from. */
export function ExamMix() {
  return (
    <>
      <div className="mix" role="img" aria-label={SECTIONS.map((s) => `${s.draw} ${s.name}`).join(', ')}>
        {SECTIONS.flatMap((s) => Array.from({ length: s.draw }, (_, i) => <i key={`${s.key}-${i}`} className={`part-${s.key}`} />))}
      </div>
      <ul className="legend">
        {SECTIONS.map((s) => (
          <li key={s.key} className={`part-${s.key}`}>
            <i />
            <span>
              <b>{s.draw}</b> {s.name}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
