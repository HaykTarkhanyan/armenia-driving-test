import { GuideItems, SignKey } from '../components/Guide.tsx'
import { Chevron } from '../components/Icons.tsx'
import { GENERAL_ITEMS, guideOf } from '../content/guides.ts'
import { SECTIONS } from '../lib/exam.ts'
import { groupTitle } from '../lib/groups.ts'
import { link } from '../lib/router.ts'

export function Shortcuts() {
  return (
    <>
      <div className="card">
        <h1>Հնարքներ</h1>
        <p>
          Հնարքները սովորելուն չեն փոխարինում. միայն դրանցով կհավաքեք մոտ 9 միավոր, իսկ պետք է 18։ Դրանք օգնում են ավելի արագ հիշել պատասխանները և չկորցնել միավորներ
          անծանոթ հարցերում։
        </p>
        <SignKey />
      </div>
      <h2 style={{ margin: '18px 2px 8px' }}>Բոլոր թեմաներում</h2>
      <GuideItems items={GENERAL_ITEMS} />
      <h2 style={{ margin: '18px 2px 8px' }}>Ըստ թեմաների</h2>
      {SECTIONS.flatMap((s) =>
        s.groups.map((g) => (
          <a key={g} className={`group-row part-${s.key}`} href={link('topics', String(g))}>
            <span className="group-num">{g}</span>
            <div>
              <b>{groupTitle(g)}</b>
              <small style={{ marginBottom: 0 }}>{guideOf(g).items.length} հնարք</small>
            </div>
            <Chevron />
          </a>
        )),
      )}
    </>
  )
}
