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
export function Karaoke({ lyrics, notes, index }: { lyrics: string[]; notes: string[]; index: number }) {
  const lines = parseLyrics(lyrics)
  return (
    <div className="karaoke" dir="rtl" aria-label="מילים לקריוקי">
      {lines.map((line, li) => {
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
