import type { Question } from '../lib/data.ts'
import { groupTitle } from '../lib/groups.ts'

const KEYS = 'ԱԲԳԴԵ'

type Props = {
  question: Question
  /** Option indices (PDF order) in the order they are shown. */
  order: readonly number[]
  /** The chosen option, as an index in PDF order. */
  chosen: number | null
  /** Show right/wrong colouring (practice after answering, exam review). */
  reveal: boolean
  onChoose?: (index: number) => void
  label?: string
}

export function QuestionCard({ question, order, chosen, reveal, onChoose, label }: Props) {
  return (
    <div className="card question">
      <div className="question-meta">
        {label && <span>{label}</span>}
        <span>
          Հարց {question.group}-{question.number} · {groupTitle(question.group)}
        </span>
      </div>
      <p className="question-text">{question.question}</p>
      {question.imageUrl && <img className="question-img" src={question.imageUrl} alt={`Հարց ${question.group}-${question.number}-ի նկարը`} />}
      <div className="options">
        {order.map((i, shown) => {
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
              {!question.fixedOrder && <span className="option-key">{KEYS[shown]}</span>}
              <span className="option-text">{question.options[i]}</span>
            </button>
          )
        })}
      </div>
      {reveal && question.note && <p className="key-note">{question.note}</p>}
    </div>
  )
}
