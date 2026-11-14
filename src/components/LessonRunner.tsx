import { useEffect, useRef, useState } from 'react'
import type { Lesson, Step } from '../lessons/data'
import { hebrewName } from '../lessons/data'
import { SequenceMatcher } from '../lessons/sequence'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { playTone, playMelody } from '../audio/tone'
import { STYLES, startBacking } from '../audio/backing'
import type { Backing } from '../audio/backing'
import { speak, stopSpeaking, voiceEnabled, getHebrewVoice } from '../harmonica/speech'
import { HarmonicaView, holeLabel } from './HarmonicaView'
import { MicBar } from './MicBar'
import { NoteMeter } from './NoteMeter'
import { useFlash } from './useFlash'

type Phase = 'gate' | 'speaking' | 'ready' | 'listening' | 'success'

interface Props {
  lesson: Lesson
  startStep: number
  onStep: (i: number) => void
  onComplete: (skips: number) => void
  onExit: () => void
}

const stepNotes = (s: Step): string[] =>
  s.kind === 'practice' ? Array(s.repeats).fill(s.note) : s.kind === 'check' || s.kind === 'echo' ? s.notes : []

export function LessonRunner({ lesson, startStep, onStep, onComplete, onExit }: Props) {
  const [stepIdx, setStepIdx] = useState(Math.min(startStep, lesson.steps.length - 1))
  const [phase, setPhase] = useState<Phase>('gate')
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [msg, flash, clearMsg] = useFlash()
  const matcher = useRef<SequenceMatcher | null>(null)
  const hold = useRef<{ note: string; ms: number; start: number | null } | null>(null)
  const [holdPct, setHoldPct] = useState(0)
  const jam = useRef<{ start: number; ms: number; notes: Set<string>; backing: Backing } | null>(null)
  const [jamInfo, setJamInfo] = useState({ sec: 0, notes: 0 })
  const run = useRef(0)
  const skips = useRef(0)
  const step = lesson.steps[stepIdx]

  const mic = useMic((f) => {
    setFrame(f)
    const j = jam.current
    if (j) {
      // ג'אם: כל צליל נחשב. מצליחים אחרי הזמן, אם ניגנת לפחות 3 צלילים שונים
      if (f.stable) j.notes.add(f.stable.note)
      const el = performance.now() - j.start
      setJamInfo({ sec: Math.floor(el / 1000), notes: j.notes.size })
      if (el >= j.ms && j.notes.size >= 3) { j.backing.stop(); jam.current = null; setPhase('success') }
      return
    }
    const h = hold.current
    if (h) {
      // צליל ארוך: נמדד כל עוד הצליל המבוקש נשמע ברציפות
      const ok = f.sounding && (f.stable?.note === h.note || f.targetHit)
      const now = performance.now()
      if (ok) {
        h.start = h.start ?? now
        const pct = Math.min(1, (now - h.start) / h.ms)
        setHoldPct(pct)
        if (pct >= 1) { hold.current = null; setPhase('success') }
      } else if (h.start !== null) {
        h.start = null
        setHoldPct(0)
      }
      return
    }
    const m = matcher.current
    if (!m || m.done) return
    const t = m.target
    const e = m.push(f.stable ?? (f.targetHit && t ? { note: t, cents: 0 } : null), f.onset, f.sounding)
    if (e.advanced) { setIndex(e.index); flash('נכון!', 900) }
    if (e.wrong && m.target) flash(`כמעט! צריך ${holeLabel(m.target)}`, 2500)
    if (e.done) setPhase('success')
  }, phase !== 'listening', () => matcher.current?.target ?? hold.current?.note ?? null)

  // מפעיל את השלב הנוכחי. ההקראה תמיד נגמרת לפני שהמיקרופון מתחיל להקשיב.
  useEffect(() => {
    if (phase === 'gate') return
    const my = ++run.current
    const alive = () => run.current === my
    matcher.current = null
    hold.current = null
    setHoldPct(0)
    jam.current?.backing.stop()
    jam.current = null
    setJamInfo({ sec: 0, notes: 0 })
    setIndex(0)
    clearMsg()
    setPhase('speaking')
    void (async () => {
      await speak(step.say)
      if (!alive()) return
      if (step.kind === 'demo') {
        await playTone(step.note)
        if (!alive()) return
      }
      if (step.kind === 'echo') {
        // משחק הד: האפליקציה מנגנת, ואז מקשיבה לך
        await playMelody(step.notes, undefined, 80, () => {}).done
        if (!alive()) return
      }
      if (step.kind === 'practice' || step.kind === 'check' || step.kind === 'echo') {
        matcher.current = new SequenceMatcher(stepNotes(step))
        setPhase('listening')
      } else if (step.kind === 'jam') {
        const s = STYLES.find((x) => x.id === step.style) ?? STYLES[0]
        jam.current = { start: performance.now(), ms: step.seconds * 1000, notes: new Set(), backing: startBacking(s.bars, s.bpm, { loop: true, feel: s.feel }) }
        setPhase('listening')
      } else if (step.kind === 'hold') {
        hold.current = { note: step.note, ms: step.seconds * 1000, start: null }
        setPhase('listening')
      } else {
        setPhase('ready')
      }
    })()
    return () => { run.current++; stopSpeaking(); jam.current?.backing.stop(); jam.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, phase === 'gate'])

  // אחרי הצלחה בתרגול/בדיקה: ממשיכים אוטומטית אחרי רגע
  useEffect(() => {
    if (phase !== 'success') return
    const t = window.setTimeout(() => next(), 1200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const next = () => {
    if (stepIdx + 1 >= lesson.steps.length) { onComplete(skips.current); return }
    const n = stepIdx + 1
    setStepIdx(n)
    onStep(n)
  }

  const begin = () => { void mic.start(); setPhase('speaking') }
  const skipSpeech = () => stopSpeaking()
  const replayDemo = async () => {
    if (step.kind !== 'demo') return
    setPhase('speaking')
    await playTone(step.note)
    setPhase('ready')
  }
  const replayEcho = async () => {
    if (step.kind !== 'echo') return
    setPhase('speaking')
    await playMelody(step.notes, undefined, 80, () => {}).done
    setPhase('listening')
  }

  const notes = stepNotes(step)
  const target = matcher.current?.target ?? (step.kind === 'demo' || step.kind === 'hold' ? step.note : null)
  const noVoice = voiceEnabled() && !getHebrewVoice()

  if (phase === 'gate') {
    return (
      <div className="card">
        <h2>שיעור {lesson.number}: {lesson.title}</h2>
        <p>{lesson.goal}</p>
        <p className="sub">הקראה בעברית ומיקרופון יופעלו אחרי הלחיצה. מומלץ להשתמש באוזניות או בעוצמת קול נמוכה, כדי שהמיקרופון לא ישמע את המורה.</p>
        <button className="btn primary big" onClick={begin}>{startStep > 0 ? 'המשך שיעור' : 'התחל שיעור'}</button>
        <button className="btn" onClick={onExit}>חזרה</button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="steps">שלב {stepIdx + 1} מתוך {lesson.steps.length}</div>
      <MicBar status={mic.status} onStart={() => void mic.start()} />
      {noVoice && <div className="warn">לא נמצא קול עברי במכשיר, לכן ההדרכה מוצגת בכתב בלבד. אפשר להתקין קול עברי בהגדרות הטקסט-לדיבור של המכשיר.</div>}

      <h3>{step.kind === 'explain' ? step.title : step.kind === 'summary' ? 'סיכום' : step.kind === 'demo' ? 'הדגמה' : step.kind === 'practice' ? 'תרגול' : step.kind === 'hold' ? 'צליל ארוך' : step.kind === 'echo' ? '🎧 הד' : step.kind === 'jam' ? '🎸 ג׳אם' : 'בדיקה'}</h3>
      <p className="say">{step.say}</p>

      {(step.kind === 'demo' || step.kind === 'hold' || step.kind === 'jam' || notes.length > 0) && (
        <>
          {target && <div className="sub target-line">{target} ({hebrewName(target)}) · {holeLabel(target)}</div>}
          <HarmonicaView target={target} heard={phase === 'listening' ? frame?.stable?.note ?? null : null} />
        </>
      )}

      {notes.length > 0 && (
        <div className="dots" dir="ltr">
          {notes.map((n, i) => <span key={i} className={i < index ? 'dot done' : i === index && phase === 'listening' ? 'dot cur' : 'dot'} title={n} />)}
        </div>
      )}

      {step.kind === 'hold' && phase === 'listening' && (
        <div className="holdbar" aria-label="כמה זמן החזקת"><i style={{ width: `${Math.round(holdPct * 100)}%` }} /><span>{(holdPct * step.seconds).toFixed(1)} / {step.seconds} שניות</span></div>
      )}
      {step.kind === 'jam' && phase === 'listening' && (
        <div className="holdbar"><i style={{ width: `${Math.min(100, Math.round((jamInfo.sec / step.seconds) * 100))}%` }} /><span>{jamInfo.sec} / {step.seconds} שניות · {jamInfo.notes} צלילים שונים</span></div>
      )}
      {phase === 'listening' && step.kind !== 'jam' && <NoteMeter frame={frame} />}
      <div className="msg" aria-live="polite">{phase === 'speaking' ? 'המורה מדבר...' : phase === 'success' ? 'כל הכבוד! עוברים הלאה.' : msg}</div>

      <div className="row">
        {phase === 'speaking' && <button className="btn" onClick={skipSpeech}>דלג על ההקראה</button>}
        {phase === 'ready' && step.kind === 'demo' && <button className="btn" onClick={() => void replayDemo()}>שמע שוב</button>}
        {phase === 'ready' && <button className="btn primary" onClick={step.kind === 'summary' ? () => onComplete(skips.current) : next}>{step.kind === 'summary' ? 'סיום שיעור' : 'הבא'}</button>}
        {phase === 'listening' && step.kind === 'echo' && <button className="btn" onClick={() => void replayEcho()}>🎧 שמע שוב</button>}
        {phase === 'listening' && <button className="btn" onClick={() => { skips.current++; next() }}>דלג על שלב זה</button>}
        <button className="btn" onClick={() => { stopSpeaking(); onExit() }}>יציאה</button>
      </div>
    </div>
  )
}
