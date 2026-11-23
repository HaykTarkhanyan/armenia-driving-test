// The 10 official question groups. The PDFs do not name them: the titles describe what the questions are about.
// The app uses these groups as its topics (DECISIONS.md #12).
export const GROUP_TITLES: Record<number, string> = {
  1: 'Երթևեկության ուղղություն, հետադարձ, զիջում',
  2: '«Ճանապարհային երթևեկության անվտանգության ապահովման մասին» օրենք',
  3: 'Շահագործումն արգելող անսարքություններ',
  4: 'Ճանապարհային նշաններ',
  5: 'Խաչմերուկներ, անցման հերթականություն',
  6: 'Լուսացույց, կարգավորող, խաչմերուկներ',
  7: 'Կանգառ, կայանում, գծանշումներ',
  8: 'Արագություն, քարշակում, բեռներ, ուղևորներ',
  9: 'Ազդանշաններ, լուսային սարքեր, վազանցում, գծանցներ',
  10: 'Առաջին օգնություն',
}

export const GROUP_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export function groupTitle(group: number): string {
  const title = GROUP_TITLES[group]
  if (title === undefined) throw new Error(`no group ${group}`)
  return title
}
