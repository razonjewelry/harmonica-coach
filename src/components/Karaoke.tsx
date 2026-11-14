import { findHole } from '../harmonica/notes'
import { parseLyrics } from '../lessons/melodies'

function tag(note: string): string {
  const f = findHole(note)[0]
  return f ? `${f.hole}${f.action === 'blow' ? '↑' : '↓'}` : note
}

/**
 * קריוקי למפוחית: כל הברה מוצגת עם החור והכיוון שלה (↑ נשיפה, ↓ שאיפה).
 * ההברה הנוכחית מודגשת, מה שכבר נוגן מסומן, והבא בתור מעומעם.
 */
export function Karaoke({ lyrics, notes, index, compact }: { lyrics: string[]; notes: string[]; index: number; compact?: boolean }) {
  const lines = parseLyrics(lyrics)
  // במצב קומפקטי מציגים רק את השורה הנוכחית והבאה, כדי שהמפוחית תישאר בתצוגה
  let cur = lines.findIndex((l) => l.some((x) => x.index === index))
  if (cur < 0) cur = lines.length - 1
  const visible = compact ? lines.map((l, i) => ({ l, i })).filter(({ i }) => i === cur || i === cur + 1) : lines.map((l, i) => ({ l, i }))
  return (
    <div className="karaoke" dir="rtl" aria-label="מילים לקריוקי">
      {compact && <div className="sub tiny">שורה {cur + 1} מתוך {lines.length}</div>}
      {visible.map(({ l: line, i: li }) => {
        const active = line.some((s) => s.index === index)
        const past = line.every((s) => s.index < index)
        return (
          <div key={li} className={`kline${active ? ' active' : past ? ' past' : ''}`}>
            {line.map((s) => (
              <span key={s.index} className={`syl${s.index < index ? ' done' : s.index === index ? ' cur' : ''}${s.wordEnd ? ' we' : ''}`}>
                <b>{s.text}</b>
                <i dir="ltr">{tag(notes[s.index])}</i>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
