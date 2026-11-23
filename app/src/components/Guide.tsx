import type { GuideItem, GuideKind, GuideNumber } from '../content/guides.ts'
import { statLabel } from '../lib/hints.ts'
import { link } from '../lib/router.ts'
import { Sign } from './Icons.tsx'

const KIND_NAMES: [GuideKind, string][] = [
  ['rule', 'Կանոն'],
  ['lean', 'Հաճախ է աշխատում'],
  ['never', 'Չընտրել'],
  ['exception', 'Բացառություն'],
]

export function SignKey() {
  return (
    <ul className="sign-key">
      {KIND_NAMES.map(([kind, name]) => (
        <li key={kind}>
          <Sign kind={kind} />
          {name}
        </li>
      ))}
    </ul>
  )
}

export function Numbers({ numbers }: { numbers: GuideNumber[] }) {
  return (
    <div className="numbers">
      {numbers.map((n) => (
        <div className="number" key={`${n.value}-${n.label}`}>
          {n.speed ? (
            <b className="speed-sign">{n.value}</b>
          ) : (
            <b>
              {n.value}
              {n.unit && <small>{n.unit}</small>}
            </b>
          )}
          <span>{n.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Three or more sentences are facts to scan on a phone, so each gets its own line. */
function Body({ text }: { text: string }) {
  const sentences = text.split(/(?<=։)\s+/)
  if (sentences.length < 3) return <p>{text}</p>
  return (
    <ul className="facts">
      {sentences.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  )
}

export function GuideItems({ items }: { items: GuideItem[] }) {
  return (
    <div className="card">
      {items.map((item) => {
        const proof = item.stat ? statLabel(item.stat) : item.proof
        return (
          <article className="guide-item" key={item.title}>
            <Sign kind={item.kind} />
            <div>
              <h3>{item.title}</h3>
              <Body text={item.body} />
              {proof && <span className="proof">{proof} ճիշտ</span>}
              {item.refs && (
                <a className="linklike small" href={link('practice', 'list', item.refs.join(','))}>
                  Պարապել այս {item.refs.length === 1 ? 'հարցը' : `${item.refs.length} հարցը`}
                </a>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
