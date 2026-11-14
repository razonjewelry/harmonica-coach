import { LAYOUT, findHole, noteToMidi } from '../harmonica/notes'

interface Props {
  /** הצליל הנדרש: מסומן בחור המתאים */
  target?: string | null
  /** הצליל שזוהה ביציבות: מודגש */
  heard?: string | null
}

/** חורי המפוחית לפי הסדר הפיזי: חור 1 משמאל, חור 10 מימין */
export function HarmonicaView({ target, heard }: Props) {
  const t = target ? findHole(target) : []
  const h = heard ? findHole(heard) : []
  const cls = (hole: number, action: 'blow' | 'draw') => {
    const isT = t.some((x) => x.hole === hole && x.action === action)
    const isH = h.some((x) => x.hole === hole && x.action === action)
    return `cell ${action}${isT ? ' target' : ''}${isH ? ' heard' : ''}`
  }
  return (
    <div className="harp" dir="ltr" aria-label="מפוחית C עם עשרה חורים">
      {Object.keys(LAYOUT).map(Number).map((n) => (
        <div className="hole" key={n}>
          <div className={cls(n, 'blow')} title="נשיפה"><span className="arrow">↑</span>{LAYOUT[n].blow}</div>
          <div className="num">{n}</div>
          <div className={cls(n, 'draw')} title="שאיפה"><span className="arrow">↓</span>{LAYOUT[n].draw}</div>
        </div>
      ))}
    </div>
  )
}

const ACT = { blow: 'נשיפה', draw: 'שאיפה' } as const

/** אם הצליל לא קיים במפוחית, בודק אם זה כנראה כיפוף (חצי טון או טון מתחת לצליל רגיל) */
export function bendHint(note: string): string {
  const m = noteToMidi(note)
  for (const h of Object.keys(LAYOUT).map(Number))
    for (const a of ['draw', 'blow'] as const) {
      const d = noteToMidi(LAYOUT[h][a]) - m
      if (d === 1 || d === 2) return `לא צליל רגיל במפוחית. אולי כיפוף של חור ${h} ${ACT[a]}. נסה בעדינות, בלי לחץ`
    }
  return 'צליל שלא קיים במפוחית'
}

export function holeLabel(note: string): string {
  const fs = findHole(note)
  if (!fs.length) return bendHint(note)
  const txt = fs.map((f) => `חור ${f.hole} ${ACT[f.action]}`).join(' או ')
  return fs.length > 1 ? `${txt} (אותו צליל)` : txt
}
