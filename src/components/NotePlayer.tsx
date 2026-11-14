import { useEffect, useRef, useState } from 'react'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { playMelody, stopPlayback } from '../audio/tone'
import { autoChords, startBacking } from '../audio/backing'
import type { Backing } from '../audio/backing'
import { SequenceMatcher } from '../lessons/sequence'
import { HarmonicaView, holeLabel } from './HarmonicaView'
import { MicBar } from './MicBar'
import { Karaoke } from './Karaoke'
import { LineKaraoke } from './LineKaraoke'
import { autoPhrases } from '../lessons/melodies'
import { hebrewName } from '../lessons/data'
import { useFlash } from './useFlash'
import { RhythmTapper } from './RhythmTapper'

/** מאזין לרצף צלילים דרך המיקרופון ומציג מה לנגן עכשיו. משמש לתרגול ולמנגינות. */
export function NotePlayer({ notes, lyrics, beats, bpm = 100, phrases, onDone, onRhythm }: { notes: string[]; lyrics?: string[]; beats?: number[]; bpm?: number; phrases?: number[]; onDone?: () => void; onRhythm?: (beats: number[], bpm: number) => void }) {
  const matcher = useRef(new SequenceMatcher(notes))
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [msg, flash, clearMsg] = useFlash()
  const [finished, setFinished] = useState(false)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const previewRun = useRef(0)
  const [speed, setSpeed] = useState(1)
  const [tapping, setTapping] = useState(false)
  const [withBand, setWithBand] = useState(true)
  const band = useRef<Backing | null>(null)
  const autoBeats = beats ?? (phrases ? phrases.flatMap((c) => Array.from({ length: c }, (_, k) => (k === c - 1 ? 2 : 1))) : undefined)
  const playBpm = beats ? bpm : Math.min(bpm, 90)

  const mic = useMic(
    (f) => {
      setFrame(f)
      if (matcher.current.done) return
      const t = matcher.current.target
      // צליל מזוהה כללי, או אימות מחזוריות של הצליל המבוקש (לצלילים נשימתיים)
      const eff = f.stable ?? (f.targetHit && t ? { note: t, cents: 0 } : null)
      const e = matcher.current.push(eff, f.onset, f.sounding)
      if (e.advanced) { setIndex(e.index); flash('נכון!', 900) }
      if (e.wrong && matcher.current.target) flash(`כמעט! צריך ${holeLabel(matcher.current.target)}`, 2500)
      if (e.done && !finished) { setFinished(true); onDone?.() }
    },
    finished || previewIdx !== null,
    () => matcher.current.target,
  )

  useEffect(() => () => { previewRun.current++; stopPlayback(); band.current?.stop() }, [])

  const restart = () => { matcher.current = new SequenceMatcher(notes); setIndex(0); clearMsg(); setFinished(false) }
  const stopPreview = () => { previewRun.current++; stopPlayback(); band.current?.stop(); band.current = null; setPreviewIdx(null) }
  const preview = async () => {
    const my = ++previewRun.current
    setPreviewIdx(0)
    const h = playMelody(notes, autoBeats, playBpm * speed, (i) => { if (previewRun.current === my) setPreviewIdx(i) })
    // ליווי: אקורדים שנבחרים לפי המנגינה, באותו קצב
    if (withBand) band.current = startBacking(autoChords(notes, autoBeats), playBpm * speed, { volume: 0.55 })
    await h.done
    band.current?.stop()
    band.current = null
    if (previewRun.current === my) setPreviewIdx(null)
  }

  const target = matcher.current.target
  const shownIndex = previewIdx ?? index

  const shownTarget = previewIdx !== null ? notes[previewIdx] : finished ? null : target
  const heardNote = frame?.raw?.note ?? null
  const heardStable = !!frame?.stable && frame.stable.note === heardNote

  if (tapping && onRhythm) {
    return <RhythmTapper notes={notes} lyrics={lyrics} phrases={phrases} beats={beats} onCancel={() => setTapping(false)} onDone={(b, p) => { setTapping(false); onRhythm(b, p) }} />
  }

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
      {lyrics && !phrases ? (
        <Karaoke lyrics={lyrics} notes={notes} index={shownIndex} compact />
      ) : (
        <LineKaraoke lyrics={lyrics ?? []} phrases={phrases ?? autoPhrases(notes, beats)} notes={notes} index={shownIndex} />
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
        {onRhythm && previewIdx === null && <button className="btn" onClick={() => { stopPlayback(); setTapping(true) }}>🥁 הקש קצב</button>}
        <button className={`btn chipbtn${withBand ? ' on' : ''}`} onClick={() => setWithBand(!withBand)} disabled={previewIdx !== null}>🎸 ליווי</button>
        <div className="speed" role="group" aria-label="מהירות ההדגמה">
          {[0.5, 0.75, 1].map((s) => (
            <button key={s} className={`btn chipbtn${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s === 1 ? 'רגיל' : `${Math.round(s * 100)}%`}</button>
          ))}
        </div>
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
