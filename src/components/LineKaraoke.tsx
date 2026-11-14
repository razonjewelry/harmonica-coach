import { findHole } from '../harmonica/notes'

function tag(note: string): string {
  const f = findHole(note)[0]
  return f ? `${f.hole}${f.action === 'blow' ? '↑' : '↓'}` : note
}

/**
 * קריוקי לפי שורות: מציג את שורת המילים הנוכחית (והבאה אחריה), ומתחתיה את החורים של אותה פסוקית.
 * החור הנוכחי מודגש, כך שרואים איפה אתה נמצא בתוך השורה.
 */
export function LineKaraoke({ lyrics, phrases, notes, index }: { lyrics: string[]; phrases: number[]; notes: string[]; index: number }) {
  const starts: number[] = []
  let acc = 0
  for (const c of phrases) { starts.push(acc); acc += c }
  let cur = phrases.findIndex((c, i) => index >= starts[i] && index < starts[i] + c)
  if (cur < 0) cur = phrases.length - 1
  const show = [cur, cur + 1].filter((i) => i < phrases.length)
  return (
    <div className="karaoke" dir="rtl" aria-label="מילים לקריוקי">
      <div className="sub tiny">שורה {cur + 1} מתוך {phrases.length}</div>
      {show.map((i) => (
        <div key={i} className={`kline lyric${i === cur ? ' active' : ''}`}>
          <div className="ltext">{lyrics[i] ?? ''}</div>
          <div className="lholes" dir="ltr">
            {Array.from({ length: phrases[i] }, (_, k) => {
              const n = starts[i] + k
              return <span key={n} className={`hc${n < index ? ' done' : n === index ? ' cur' : ''}`}>{tag(notes[n])}</span>
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
