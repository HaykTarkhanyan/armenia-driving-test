import { useEffect, useState } from 'react'
import type { Question } from '../lib/data.ts'
import { SOURCES, useExplanation } from '../lib/explanations.ts'
import { groupTitle } from '../lib/groups.ts'
import { hintFor, hintText } from '../lib/hints.ts'
import { link } from '../lib/router.ts'
import { Sign } from './Icons.tsx'

type Props = {
  question: Question
  /** Option indices (PDF order) in the order they are shown. */
  order: readonly number[]
  /** The chosen option, as an index in PDF order. */
  chosen: number | null
  /** Show right/wrong colouring and the shortcut (practice after answering, exam review). */
  reveal: boolean
  onChoose?: (index: number) => void
  label?: string
}

/** Road pictures carry the answer and are small on a phone: tap to see one across the whole screen. */
function Picture({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <>
      <button type="button" className="img-zoom" aria-label="Մեծացնել նկարը" onClick={() => setOpen(true)}>
        <img className="question-img" src={src} alt={alt} />
      </button>
      {open && (
        <button type="button" className="lightbox" aria-label="Փակել նկարը" onClick={() => setOpen(false)}>
          <img src={src} alt={alt} />
        </button>
      )}
    </>
  )
}

/** Why this answer is right, with the rule it comes from. Only after answering, never during a mock exam. */
function WhyThisAnswer({ id }: { id: string }) {
  const state = useExplanation(id)
  if (state.status === 'loading' || state.status === 'none') return null
  if (state.status === 'error') return <p className="explanation bad-text">{state.message}</p>
  const { text, source, ref } = state.explanation
  return (
    <div className="explanation">
      <strong>Ինչո՞ւ</strong>
      <p>{text}</p>
      <a href={SOURCES[source].url} target="_blank" rel="noreferrer">
        Աղբյուր՝ {SOURCES[source].label}
        {ref && `, ${ref}`}
      </a>
    </div>
  )
}

export function QuestionCard({ question, order, chosen, reveal, onChoose, label }: Props) {
  const hint = reveal ? hintFor(question.id) : null
  return (
    <div className="card question">
      <div className="question-meta">
        {label && <span>{label}</span>}
        <span>
          {question.group}-{question.number}, {groupTitle(question.group)}
        </span>
      </div>
      <p className="question-text">{question.question}</p>
      {question.imageUrl && <Picture src={question.imageUrl} alt={`Հարց ${question.group}-${question.number}-ի նկարը`} />}
      <div className="options">
        {order.map((i) => {
          const classes = ['option']
          if (chosen === i) classes.push('chosen')
          if (reveal && i === question.answerIndex) classes.push('correct')
          if (reveal && chosen === i && i !== question.answerIndex) classes.push('wrong')
          return (
            <button
              // New buttons per question: a reused button keeps the focus, and Enter would "click" it on the next one.
              key={`${question.id}-${i}`}
              type="button"
              className={classes.join(' ')}
              disabled={!onChoose}
              onClick={() => onChoose?.(i)}
            >
              {/* A plain marker: a letter or number here would clash with labels such as "Միայն A" or "1 և 3". */}
              {!question.fixedOrder && <span className="option-key" aria-hidden="true">{reveal && i === question.answerIndex ? '✓' : reveal && chosen === i ? '✕' : ''}</span>}
              <span className="option-text">{question.options[i]}</span>
            </button>
          )
        })}
      </div>
      {reveal && question.note && (
        <div className="key-note">
          <Sign kind="exception" />
          <span>{question.note}</span>
        </div>
      )}
      {reveal && !question.id.startsWith('old-') && <WhyThisAnswer id={question.id} />}
      {hint && (
        <div className="hint">
          <Sign kind={hint.rule === 'never' ? 'never' : hint.works ? 'rule' : 'exception'} />
          <span>
            {hintText(hint, question.options)}
            <a href={link('topics', String(question.group))}>Այս թեմայի հնարքները</a>
          </span>
        </div>
      )}
    </div>
  )
}
