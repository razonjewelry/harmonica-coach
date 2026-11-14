import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { LESSONS, TOTAL_LESSONS } from './lessons/data'
import { Melodies } from './components/Songs'
import { readIncoming } from './components/LinkImport'
import type { Incoming } from './components/LinkImport'
import { loadProgress, markCompleted, markStep, saveProgress, resetProgress, starsFor } from './lessons/progress'
import type { LessonProgress } from './lessons/progress'
import { LessonRunner } from './components/LessonRunner'
import { NotePlayer } from './components/NotePlayer'
import { HarmonicaView } from './components/HarmonicaView'
import { MicBar } from './components/MicBar'
import { JamRoom } from './components/JamRoom'
import { NoteMeter } from './components/NoteMeter'
import { useMic } from './audio/useMic'
import type { MicFrame } from './audio/useMic'
import { getHebrewVoice, onVoicesReady, setVoiceEnabled, speak, speechSupported, voiceEnabled } from './harmonica/speech'

type Tab = 'home' | 'path' | 'practice' | 'free' | 'melodies' | 'settings'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'בית', icon: '🏠' },
  { id: 'path', label: 'מסלול', icon: '🎓' },
  { id: 'practice', label: 'תרגול', icon: '🎯' },
  { id: 'free', label: 'מאמן חופשי', icon: '🎙️' },
  { id: 'melodies', label: 'מנגינות', icon: '🎵' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

function shuffled<T>(a: T[], n: number): T[] {
  const out: T[] = []
  let prev: T | null = null
  while (out.length < n) {
    const x = a[Math.floor(Math.random() * a.length)]
    if (x !== prev || a.length === 1) { out.push(x); prev = x }
  }
  return out
}

const DRILLS: { id: string; label: string; notes: string[] }[] = [
  { id: 'blow', label: 'נשיפות חורים 4-6', notes: ['C5', 'E5', 'G5'] },
  { id: 'draw', label: 'שאיפות חורים 4-6', notes: ['D5', 'F5', 'A5'] },
  { id: 'mix', label: 'כל צלילי חורים 4-6', notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5'] },
  { id: 'scale', label: 'סולם עולה וחוזר', notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'] },
]

function FreeCoach() {
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const mic = useMic(setFrame, false)
  return (
    <div className="card">
      <h2>מאמן חופשי</h2>
      <p className="sub">נגן כל צליל. האפליקציה תציג מה שמעה, באיזה חור ובאיזה דיוק. צליל לא ברור יוצג כ"לא יציב".</p>
      <MicBar status={mic.status} onStart={() => void mic.start()} />
      <HarmonicaView heard={frame?.stable?.note ?? null} />
      <NoteMeter frame={frame} />
    </div>
  )
}

function Practice() {
  const [drill, setDrill] = useState<string | null>(null)
  const [jamming, setJamming] = useState(false)
  const [round, setRound] = useState(0)
  const notes = useMemo(() => {
    const d = DRILLS.find((x) => x.id === drill)
    if (!d) return []
    return d.id === 'scale' ? [...d.notes, ...[...d.notes].reverse().slice(1)] : shuffled(d.notes, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, round])
  if (jamming) return <JamRoom onBack={() => setJamming(false)} />
  if (!drill) {
    return (
      <div className="card">
        <button className="btn primary big" onClick={() => setJamming(true)}>🎸 חדר ג׳אם: נגן עם ליווי</button>
        <h2>חדר תרגול</h2>
        <p className="sub">בחר תרגיל. האפליקציה אומרת מה לנגן ובודקת בעזרת המיקרופון.</p>
        {DRILLS.map((d) => <button key={d.id} className="btn list" onClick={() => setDrill(d.id)}>{d.label}</button>)}
      </div>
    )
  }
  return (
    <>
      <NotePlayer key={`${drill}-${round}`} notes={notes} onDone={() => {}} />
      <div className="row">
        <button className="btn" onClick={() => setRound((r) => r + 1)}>תרגיל חדש</button>
        <button className="btn" onClick={() => setDrill(null)}>חזרה לרשימה</button>
      </div>
    </>
  )
}

function Settings({ onReset }: { onReset: () => void }) {
  const [on, setOn] = useState(voiceEnabled())
  const [, force] = useState(0)
  useEffect(() => onVoicesReady(() => force((x) => x + 1)), [])
  const voice = getHebrewVoice()
  return (
    <div className="card">
      <h2>הגדרות</h2>
      <label className="toggle">
        <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setVoiceEnabled(e.target.checked) }} />
        הדרכה קולית בעברית
      </label>
      <p className="sub">
        {!speechSupported() ? 'הדפדפן לא תומך בהקראה.' : voice ? `קול עברי זוהה: ${voice.name}` : 'לא נמצא קול עברי במכשיר. ההדרכה תוצג בכתב בלבד. אפשר להתקין קול עברי בהגדרות הטקסט-לדיבור של Android.'}
      </p>
      <button className="btn" onClick={() => void speak('שלום, אני המורה שלך למפוחית. אפשר להתחיל ללמוד.')}>בדיקת קול</button>
      <hr />
      <p className="sub">גרסה: {new Date(__BUILD__).toLocaleString('he-IL')}</p>
      <button className="btn danger" onClick={() => { if (confirm('למחוק את כל ההתקדמות?')) onReset() }}>איפוס התקדמות</button>
    </div>
  )
}

export default function App() {
  const [incoming, setIncoming] = useState<Incoming | null>(() => readIncoming())
  const [tab, setTab] = useState<Tab>(() => (readIncoming() ? 'melodies' : 'home'))
  const [progress, setProgress] = useState<LessonProgress>(() => loadProgress())
  const [lessonId, setLessonId] = useState<string | null>(null)
  const update = (p: LessonProgress) => { setProgress(p); saveProgress(p) }

  const doneCount = Object.keys(progress.completed).length
  const nextLesson = LESSONS.find((l) => !progress.completed[l.id])
  const lesson = LESSONS.find((l) => l.id === lessonId)

  if (lesson) {
    const resume = progress.last?.lessonId === lesson.id ? progress.last.step : 0
    return (
      <div className="app" dir="rtl">
        <main>
          <LessonRunner
            key={lesson.id}
            lesson={lesson}
            startStep={resume}
            onStep={(i) => update(markStep(progress, lesson.id, i))}
            onComplete={(skips) => { update(markCompleted(progress, lesson.id, new Date(), starsFor(skips))); setLessonId(null); setTab('path') }}
            onExit={() => setLessonId(null)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app" dir="rtl">
      <header><h1>Harmonica Coach</h1><span>מפוחית C · 10 חורים</span></header>
      <main>
        {tab === 'home' && (
          <div className="card">
            <h2>שלום! נלמד מפוחית</h2>
            <p className="sub">התקדמת: {doneCount} מתוך {TOTAL_LESSONS} שיעורים</p>
            {progress.streak && progress.streak.count > 1 && <p className="streak">🔥 {progress.streak.count} ימים ברצף</p>}
            {progress.last && <button className="btn primary big" onClick={() => setLessonId(progress.last!.lessonId)}>המשך מהמקום האחרון</button>}
            {!progress.last && nextLesson && <button className="btn primary big" onClick={() => setLessonId(nextLesson.id)}>שיעור {nextLesson.number}: {nextLesson.title}</button>}
            {!progress.last && !nextLesson && <p>סיימת את כל השיעורים הזמינים. אפשר לחזור עליהם במסלול, או לנגן מנגינות.</p>}
            <div className="grid">
              <button className="btn" onClick={() => setTab('practice')}>🎯 חדר תרגול</button>
              <button className="btn" onClick={() => setTab('free')}>🎙️ מאמן חופשי</button>
              <button className="btn" onClick={() => setTab('melodies')}>🎵 מנגינות</button>
              <button className="btn" onClick={() => setTab('settings')}>⚙️ הגדרות</button>
            </div>
          </div>
        )}
        {tab === 'path' && (
          <div className="card">
            <h2>מסלול לימוד</h2>
            {LESSONS.map((l) => (
              <button key={l.id} className="btn list" onClick={() => setLessonId(l.id)}>
                <b>{progress.last?.lessonId === l.id ? '▶️' : progress.completed[l.id] ? '✅' : '○'} שיעור {l.number}: {l.title} {progress.completed[l.id] ? <span className="stars">{'⭐'.repeat(progress.completed[l.id].stars ?? 3)}</span> : null}</b>
                <small>{l.goal}</small>
              </button>
            ))}
            {Array.from({ length: TOTAL_LESSONS - LESSONS.length }, (_, i) => (
              <div key={i} className="btn list locked">🔒 שיעור {LESSONS.length + i + 1} · בקרוב</div>
            ))}
          </div>
        )}
        {tab === 'practice' && <Practice />}
        {tab === 'free' && <FreeCoach />}
        {tab === 'melodies' && <Melodies incoming={incoming} onIncomingDone={() => { setIncoming(null); /* ניקוי # ו-? */ history.replaceState(null, '', window.location.pathname) }} />}
        {tab === 'settings' && <Settings onReset={() => update(resetProgress())} />}
      </main>
      <nav>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
