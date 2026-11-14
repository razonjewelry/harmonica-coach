import { LAYOUT, findHole } from '../harmonica/notes'

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

export function holeLabel(note: string): string {
  const f = findHole(note)[0]
  if (!f) return note
  return `חור ${f.hole}, ${f.action === 'blow' ? 'נשיפה' : 'שאיפה'}`
}
