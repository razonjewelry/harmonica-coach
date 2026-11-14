import { useEffect, useRef, useState } from 'react'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { playSequence } from '../audio/tone'
import { SequenceMatcher } from '../lessons/sequence'
import { HarmonicaView, holeLabel } from './HarmonicaView'
import { MicBar } from './MicBar'
import { Karaoke } from './Karaoke'
import { hebrewName } from '../lessons/data'
import { useFlash } from './useFlash'

/** מאזין לרצף צלילים דרך המיקרופון ומציג מה לנגן עכשיו. משמש לתרגול ולמנגינות. */
export function NotePlayer({ notes, lyrics, onDone }: { notes: string[]; lyrics?: string[]; onDone?: () => void }) {
  const matcher = useRef(new SequenceMatcher(notes))
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [msg, flash, clearMsg] = useFlash()
  const [finished, setFinished] = useState(false)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const previewRun = useRef(0)

  const mic = useMic(
    (f) => {
      setFrame(f)
      if (matcher.current.done) return
      const t = matcher.current.target
      // צליל מזוהה כללי, או אימות מחזוריות של הצליל המבוקש (לצלילים נשימתיים)
      const eff = f.stable ?? (f.targetHit && t ? { note: t, cents: 0 } : null)
      const e = matcher.current.push(eff, f.onset)
      if (e.advanced) { setIndex(e.index); flash('נכון!', 900) }
      if (e.wrong && matcher.current.target) flash(`שמעתי ${e.wrong}. צריך ${matcher.current.target}.`, 2500)
      if (e.done && !finished) { setFinished(true); onDone?.() }
    },
    finished || previewIdx !== null,
    () => matcher.current.target,
  )

  useEffect(() => () => { previewRun.current++ }, [])

  const restart = () => { matcher.current = new SequenceMatcher(notes); setIndex(0); clearMsg(); setFinished(false) }
  const stopPreview = () => { previewRun.current++; setPreviewIdx(null) }
  const preview = async () => {
    const my = ++previewRun.current
    setPreviewIdx(0)
    await playSequence(notes, (i) => setPreviewIdx(i), () => previewRun.current === my)
    if (previewRun.current === my) setPreviewIdx(null)
  }

  const target = matcher.current.target
  const shownIndex = previewIdx ?? index

  const shownTarget = previewIdx !== null ? notes[previewIdx] : finished ? null : target
  const heardNote = frame?.raw?.note ?? null
  const heardStable = !!frame?.stable && frame.stable.note === heardNote

  return (
    <div className="card">
      <div className="sticky">
        <div className="tline">
          {shownTarget ? (
            <>
              <b>{shownTarget}</b> <span>({hebrewName(shownTarget)})</span> <span className="sub">{holeLabel(shownTarget)}</span>
            </>
          ) : <b>סיימת!</b>}
          {previewIdx === null && (
            <span className={`chip ${heardStable ? 'ok' : ''}`}>{heardNote ? `שמעתי ${heardNote}` : 'מחכה לצליל'}</span>
          )}
        </div>
        <HarmonicaView target={shownTarget} heard={previewIdx === null ? frame?.stable?.note ?? null : null} />
      </div>
      <MicBar status={mic.status} onStart={() => void mic.start()} />
      {lyrics ? (
        <Karaoke lyrics={lyrics} notes={notes} index={shownIndex} compact />
      ) : (
        <div className="dots" dir="ltr">
          {notes.map((n, i) => <span key={i} className={i < shownIndex ? 'dot done' : i === shownIndex ? 'dot cur' : 'dot'} title={n} />)}
        </div>
      )}
      <div className="msg" aria-live="polite">
        {previewIdx !== null ? 'מנגן הדגמה... (המיקרופון מושהה)' : msg}
      </div>
      {finished && previewIdx === null && (
        <div className="success">
          <h2>סיימת!</h2>
          <button className="btn primary" onClick={restart}>עוד פעם</button>
        </div>
      )}
      <div className="row">
        {previewIdx === null
          ? <button className="btn" onClick={() => void preview()}>🔊 שמע איך זה הולך</button>
          : <button className="btn" onClick={stopPreview}>⏹ עצור הדגמה</button>}
        {!finished && previewIdx === null && (
          <>
            <button className="btn" onClick={() => { const m = matcher.current; m.skip(); setIndex(m.index); flash('דילגת על הצליל', 1200) }}>דלג על הצליל</button>
            <button className="btn" onClick={restart}>התחל מהתחלה</button>
          </>
        )}
      </div>
    </div>
  )
}
