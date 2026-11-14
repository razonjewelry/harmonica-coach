import { useRef, useState } from 'react'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { SequenceMatcher } from '../lessons/sequence'
import { HarmonicaView, holeLabel } from './HarmonicaView'
import { MicBar } from './MicBar'
import { NoteMeter } from './NoteMeter'
import { Karaoke } from './Karaoke'
import { hebrewName } from '../lessons/data'

/** מאזין לרצף צלילים דרך המיקרופון ומציג מה לנגן עכשיו. משמש לתרגול ולמנגינות. */
export function NotePlayer({ notes, lyrics, onDone }: { notes: string[]; lyrics?: string[]; onDone?: () => void }) {
  const matcher = useRef(new SequenceMatcher(notes))
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [msg, setMsg] = useState('')
  const [finished, setFinished] = useState(false)

  const mic = useMic((f) => {
    setFrame(f)
    if (matcher.current.done) return
    const e = matcher.current.push(f.stable)
    if (e.advanced) { setIndex(e.index); setMsg('נכון!') }
    if (e.wrong && matcher.current.target) setMsg(`שמעתי ${e.wrong}. צריך ${matcher.current.target}.`)
    if (e.done && !finished) { setFinished(true); onDone?.() }
  }, finished)

  const restart = () => { matcher.current = new SequenceMatcher(notes); setIndex(0); setMsg(''); setFinished(false) }
  const target = matcher.current.target

  return (
    <div className="card">
      <MicBar status={mic.status} onStart={() => void mic.start()} />
      {lyrics ? (
        <Karaoke lyrics={lyrics} notes={notes} index={index} />
      ) : (
        <div className="dots" dir="ltr">
          {notes.map((n, i) => <span key={i} className={i < index ? 'dot done' : i === index ? 'dot cur' : 'dot'} title={n} />)}
        </div>
      )}
      {finished ? (
        <div className="success">
          <h2>סיימת!</h2>
          <button className="btn primary" onClick={restart}>עוד פעם</button>
        </div>
      ) : (
        <>
          <div className="target">
            <div className="big">{target} <small>({target ? hebrewName(target) : ''})</small></div>
            <div className="sub">{target ? holeLabel(target) : ''}</div>
          </div>
          <HarmonicaView target={target} heard={frame?.stable?.note ?? null} />
          <NoteMeter frame={frame} />
          <div className="msg" aria-live="polite">{msg}</div>
          <button className="btn" onClick={restart}>התחל מהתחלה</button>
        </>
      )}
    </div>
  )
}
