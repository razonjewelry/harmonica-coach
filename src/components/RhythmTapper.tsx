import { useRef, useState } from 'react'
import { playTone } from '../audio/tone'
import { LineKaraoke } from './LineKaraoke'
import { autoPhrases } from '../lessons/melodies'

/** הופך זמני הקשה לפעימות: החציון = פעימה אחת, מעוגל לרבע פעימה */
export function tapsToBeats(times: number[], count: number): { beats: number[]; bpm: number } {
  const d: number[] = []
  for (let i = 0; i + 1 < times.length; i++) d.push(times[i + 1] - times[i])
  const sorted = [...d].sort((a, b) => a - b)
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 500
  const beats = Array.from({ length: count }, (_, i) => {
    const v = d[i] ?? med
    return Math.min(8, Math.max(0.25, Math.round((v / med) * 4) / 4))
  })
  return { beats, bpm: Math.round(Math.min(200, Math.max(40, 60000 / med))) }
}

/**
 * לימוד קצב: שומעים את השיר (למשל ביוטיוב) ומקישים בכל צליל חדש.
 * בכל הקשה נשמע הצליל של המפוחית, כדי לוודא שאתה במקום הנכון בשיר.
 */
export function RhythmTapper({ notes, lyrics, phrases, beats, onDone, onCancel }: {
  notes: string[]; lyrics?: string[]; phrases?: number[]; beats?: number[]
  onDone: (beats: number[], bpm: number) => void; onCancel: () => void
}) {
  const times = useRef<number[]>([])
  const [count, setCount] = useState(0)

  const tap = () => {
    if (count >= notes.length) return
    times.current.push(performance.now())
    void playTone(notes[count], 0.35)
    setCount(count + 1)
  }
  const undo = () => { times.current.pop(); setCount(Math.max(0, count - 1)) }
  const finish = () => {
    // הסיום מסמן את סוף הצליל האחרון
    const t = [...times.current, performance.now()]
    const r = tapsToBeats(t, notes.length)
    onDone(r.beats, r.bpm)
  }
  const done = count >= notes.length

  return (
    <div className="card">
      <h2>🥁 לימוד קצב</h2>
      <p className="sub">הפעל את השיר ביוטיוב (בטלפון אחר, במחשב או בלשונית אחרת). הקש על הכפתור הגדול בכל פעם שמתחיל צליל חדש בשיר. בסוף לחץ "סיום".</p>
      <LineKaraoke lyrics={lyrics ?? []} phrases={phrases ?? autoPhrases(notes, beats)} notes={notes} index={count} />
      <div className="sub">{count} מתוך {notes.length}</div>
      <button className="btn primary tapbtn" onPointerDown={(e) => { e.preventDefault(); tap() }} disabled={done}>
        {done ? 'כל הצלילים סומנו' : 'הקש'}
      </button>
      <div className="row">
        <button className="btn" onClick={undo} disabled={count === 0}>↩ בטל הקשה</button>
        <button className="btn primary" onClick={finish} disabled={count < 2}>✓ סיום ושמירה</button>
        <button className="btn" onClick={onCancel}>ביטול</button>
      </div>
      {!done && count > 1 && <p className="sub">אם תלחץ "סיום" לפני הסוף, שאר הצלילים יקבלו את הקצב הממוצע.</p>}
    </div>
  )
}
