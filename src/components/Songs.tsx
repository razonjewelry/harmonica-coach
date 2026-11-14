import { useState } from 'react'
import { MELODIES } from '../lessons/melodies'
import { parseTab, loadSongs, saveSongs, countSyllables } from '../lessons/tab'
import type { CustomSong } from '../lessons/tab'
import { NotePlayer } from './NotePlayer'

function SongForm({ onSave, onCancel }: { onSave: (s: CustomSong) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState('')
  const [lyrics, setLyrics] = useState('')
  const parsed = tab.trim() ? parseTab(tab) : null
  const lines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean)
  const syl = countSyllables(lines)
  const mismatch = !!parsed && !parsed.error && lines.length > 0 && syl !== parsed.notes.length
  const canSave = !!title.trim() && !!parsed && !parsed.error && !mismatch
  return (
    <div className="card">
      <h2>הוספת שיר משלי</h2>
      <p className="sub">השיר נשמר רק בטלפון שלך. כתוב את הצלילים לפי חורים: מספר חור ואז + לנשיפה או - לשאיפה.</p>
      <label className="field">שם השיר<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="field">צלילים (טאבים), למשל: 4+ 4+ 6+ 6+ 6- 6-. לצליל ארוך הוסף נקודתיים ומספר פעימות: 6+:2
        <textarea dir="ltr" rows={3} value={tab} onChange={(e) => setTab(e.target.value)} />
      </label>
      {parsed?.error && <div className="warn">{parsed.error}</div>}
      {parsed && !parsed.error && <div className="sub">{parsed.notes.length} צלילים</div>}
      <label className="field">מילים (לא חובה). שורה לכל פסוקית, הברה לכל צליל. אפשר לחלק מילה להברות עם מקף
        <textarea rows={4} value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
      </label>
      {lines.length > 0 && parsed && !parsed.error && (
        <div className={mismatch ? 'warn' : 'sub'}>{syl} הברות מול {parsed.notes.length} צלילים{mismatch ? '. צריך שיהיה מספר זהה' : ''}</div>
      )}
      <div className="row">
        <button className="btn primary" disabled={!canSave} onClick={() => onSave({ id: 'c' + Date.now(), title: title.trim(), notes: parsed!.notes, beats: parsed!.beats, lyrics: lines })}>שמור שיר</button>
        <button className="btn" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  )
}

interface Item { id: string; title: string; notes: string[]; lyrics?: string[]; beats?: number[]; bpm?: number; mine?: boolean }

export function Melodies() {
  const [id, setId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState<CustomSong[]>(() => loadSongs())
  const all: Item[] = [
    ...MELODIES,
    ...custom.map((c) => ({ ...c, lyrics: c.lyrics.length ? c.lyrics : undefined, mine: true })),
  ]
  const mel = all.find((m) => m.id === id)
  const persist = (c: CustomSong[]) => { setCustom(c); saveSongs(c) }
  if (adding) return <SongForm onCancel={() => setAdding(false)} onSave={(s) => { persist([...custom, s]); setAdding(false) }} />
  if (!mel) {
    return (
      <div className="card">
        <h2>ספריית מנגינות</h2>
        <p className="sub">לחץ על שיר כדי לשמוע איך הוא הולך ולנגן אותו עם מילים.</p>
        {all.map((m) => (
          <div key={m.id} className="songrow">
            <button className="btn list" onClick={() => setId(m.id)}>{m.title} · {m.notes.length} צלילים</button>
            {m.mine && <button className="btn danger small" onClick={() => { if (confirm('למחוק את השיר?')) persist(custom.filter((c) => c.id !== m.id)) }}>🗑</button>}
          </div>
        ))}
        <button className="btn primary big" onClick={() => setAdding(true)}>➕ הוסף שיר משלי</button>
      </div>
    )
  }
  return (
    <>
      <h2 className="pad">{mel.title}</h2>
      <NotePlayer key={mel.id} notes={mel.notes} lyrics={mel.lyrics} beats={mel.beats} bpm={mel.bpm} />
      <div className="row"><button className="btn" onClick={() => setId(null)}>חזרה לרשימה</button></div>
    </>
  )
}
