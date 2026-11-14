import { useEffect, useRef, useState } from 'react'
import { STYLES, startBacking } from '../audio/backing'
import type { Backing } from '../audio/backing'
import { useMic } from '../audio/useMic'
import type { MicFrame } from '../audio/useMic'
import { HarmonicaView } from './HarmonicaView'
import { MicBar } from './MicBar'

/** חדר ג'אם: ליווי של אקורדים ותופים, ואתה מאלתר מעליו. כל צליל בחורים 4-7 מתאים. */
export function JamRoom({ onBack }: { onBack: () => void }) {
  const [style, setStyle] = useState(STYLES[0].id)
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState<MicFrame | null>(null)
  const [count, setCount] = useState(0)
  const backing = useRef<Backing | null>(null)
  const last = useRef<string | null>(null)
  const mic = useMic((f) => {
    setFrame(f)
    const n = f.stable?.note ?? null
    if (n && n !== last.current) setCount((c) => c + 1)
    last.current = n
  }, !playing)

  useEffect(() => () => backing.current?.stop(), [])

  const toggle = () => {
    if (playing) { backing.current?.stop(); backing.current = null; setPlaying(false); return }
    const s = STYLES.find((x) => x.id === style)!
    backing.current = startBacking(s.bars, s.bpm, { loop: true, feel: s.feel })
    void mic.start()
    setCount(0)
    setPlaying(true)
  }

  return (
    <div className="card">
      <h2>🎸 חדר ג'אם</h2>
      <p className="sub">האפליקציה מנגנת ליווי, ואתה מנגן מה שבא לך מעליו. כל צליל בחורים 4 עד 7 יישמע טוב. נגן צלילים ארוכים, חזור על משפטים קצרים, ותהנה. עדיף עם אוזניות.</p>
      <div className="speed" role="group" aria-label="סגנון">
        {STYLES.map((s) => (
          <button key={s.id} className={`btn chipbtn${style === s.id ? ' on' : ''}`} disabled={playing} onClick={() => setStyle(s.id)}>{s.title}</button>
        ))}
      </div>
      <button className={`btn big ${playing ? '' : 'primary'}`} onClick={toggle}>{playing ? '⏹ עצור את הליווי' : '▶ התחל ג׳אם'}</button>
      <MicBar status={mic.status} onStart={() => void mic.start()} />
      <HarmonicaView heard={frame?.stable?.note ?? null} />
      {playing && <div className="msg">ניגנת {count} צלילים 🎵</div>}
      <button className="btn" onClick={() => { backing.current?.stop(); onBack() }}>חזרה</button>
    </div>
  )
}
