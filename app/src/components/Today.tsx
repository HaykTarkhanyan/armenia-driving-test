import { useMemo } from 'react'
import { dailyActivity, dayKey, streaks } from '../lib/insights.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { useSettings } from '../lib/settings.ts'
import { Flame } from './Icons.tsx'

export function useToday() {
  const { answers } = useProgress()
  const { dailyGoal } = useSettings()
  const today = dayKey(new Date())
  return useMemo(() => {
    const activity = dailyActivity(answers)
    return { today, activity, goal: dailyGoal, done: activity.get(today)?.total ?? 0, streak: streaks(activity.keys(), today) }
  }, [answers, today, dailyGoal])
}

export function streakWord(days: number): string {
  return days === 0 ? 'Շարքը դեռ չի սկսվել' : `${days} օր անընդմեջ`
}

/** The main action of the app: today's goal, the streak, and one button that starts the right questions. */
export function TodayCard() {
  const { done, goal, streak } = useToday()
  const reached = done >= goal
  const left = goal - done
  return (
    <section className="today">
      <div className="today-top">
        <span className={`streak ${streak.doneToday ? 'lit' : ''}`}>
          <Flame />
          {streakWord(streak.current)}
        </span>
        <span>
          <b>{done}</b> / {goal} այսօր
        </span>
      </div>
      <div className="today-bar" role="progressbar" aria-valuenow={Math.min(done, goal)} aria-valuemin={0} aria-valuemax={goal} aria-label="Այսօրվա նպատակ">
        <span style={{ width: `${Math.min(100, (100 * done) / goal)}%` }} />
      </div>
      <a className="button today-go" href={link('practice', 'today', `${done > 0 && !reached ? left : goal}-${done}`)}>
        {done === 0 ? 'Սկսել այսօրվա պարապմունքը' : reached ? 'Պարապել ևս' : `Շարունակել, մնաց ${left} հարց`}
      </a>
      {!streak.doneToday && streak.current > 0 && <p>Պատասխանեք գոնե մեկ հարցի, որ շարքը չընդհատվի։</p>}
    </section>
  )
}
