// Option order. The real exam shows the options in random order, so the app does too, except when the options are
// only labels of something in the picture ("1, 2, 3", "A, B"): those read naturally only in order.
import { shuffle } from './random.ts'

const LABEL = /^(\d+\.?|[A-Z]|[Ա-Ֆ])$/u

export function isLabelQuestion(options: readonly string[]): boolean {
  return options.every((o) => LABEL.test(o.trim()))
}

/** Option indices in the order they are shown. */
export function displayOrder(optionCount: number, fixed: boolean, rand: () => number = Math.random): number[] {
  const order = Array.from({ length: optionCount }, (_, i) => i)
  return fixed ? order : shuffle(order, rand)
}
