import { useEffect, useRef, useState } from 'react'
import type { Lesson, Step } from '../lessons/data'
import { hebrewName } from '../lessons/data'
import { SequenceMatcher } from '../lessons/sequence'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { playTone } from '../audio/tone'
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
  onComplete: () => void
  onExit: () => void
}

const stepNotes = (s: Step): string[] =>
  s.kind === 'practice' ? Array(s.repeats).fill(s.note) : s.kind === 'check' ? s.notes : []

export function LessonRunner({ lesson, startStep, onStep, onComplete, onExit }: Props) {
  const [stepIdx, setStepIdx] = useState(Math.min(startStep, lesson.steps.length - 1))
  const [phase, setPhase] = useState<Phase>('gate')
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [msg, flash, clearMsg] = useFlash()
  const matcher = useRef<SequenceMatcher | null>(null)
  const run = useRef(0)
  const step = lesson.steps[stepIdx]

  const mic = useMic((f) => {
    setFrame(f)
    const m = matcher.current
    if (!m || m.done) return
    const t = m.target
    const e = m.push(f.stable ?? (f.targetHit && t ? { note: t, cents: 0 } : null), f.onset)
    if (e.advanced) { setIndex(e.index); flash('נכון!', 900) }
    if (e.wrong && m.target) flash(`שמעתי ${e.wrong}. צריך ${m.target}.`, 2500)
    if (e.done) setPhase('success')
  }, phase !== 'listening', () => matcher.current?.target ?? null)

  // מפעיל את השלב הנוכחי. ההקראה תמיד נגמרת לפני שהמיקרופון מתחיל להקשיב.
  useEffect(() => {
    if (phase === 'gate') return
    const my = ++run.current
    const alive = () => run.current === my
    matcher.current = null
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
      if (step.kind === 'practice' || step.kind === 'check') {
        matcher.current = new SequenceMatcher(stepNotes(step))
        setPhase('listening')
      } else {
        setPhase('ready')
      }
    })()
    return () => { run.current++; stopSpeaking() }
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
    if (stepIdx + 1 >= lesson.steps.length) { onComplete(); return }
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

  const notes = stepNotes(step)
  const target = matcher.current?.target ?? (step.kind === 'demo' ? step.note : null)
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

      <h3>{step.kind === 'explain' ? step.title : step.kind === 'summary' ? 'סיכום' : step.kind === 'demo' ? 'הדגמה' : step.kind === 'practice' ? 'תרגול' : 'בדיקה'}</h3>
      <p className="say">{step.say}</p>

      {(step.kind === 'demo' || notes.length > 0) && (
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

      {phase === 'listening' && <NoteMeter frame={frame} />}
      <div className="msg" aria-live="polite">{phase === 'speaking' ? 'המורה מדבר...' : phase === 'success' ? 'כל הכבוד! עוברים הלאה.' : msg}</div>

      <div className="row">
        {phase === 'speaking' && <button className="btn" onClick={skipSpeech}>דלג על ההקראה</button>}
        {phase === 'ready' && step.kind === 'demo' && <button className="btn" onClick={() => void replayDemo()}>שמע שוב</button>}
        {phase === 'ready' && <button className="btn primary" onClick={step.kind === 'summary' ? onComplete : next}>{step.kind === 'summary' ? 'סיום שיעור' : 'הבא'}</button>}
        {phase === 'listening' && <button className="btn" onClick={next}>דלג על שלב זה</button>}
        <button className="btn" onClick={() => { stopSpeaking(); onExit() }}>יציאה</button>
      </div>
    </div>
  )
}
