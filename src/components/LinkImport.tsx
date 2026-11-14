import { useEffect, useRef, useState } from 'react'
import { findHole } from '../harmonica/notes'
import { bookmarklet, parsePageLines, parsePageText, unpackJson } from '../lessons/share'
import type { CustomSong } from '../lessons/tab'

export interface Incoming { kind: 'song' | 'page' | 'text'; data: string; title?: string }

/** קורא את ה-# של הכתובת: #song=... (שיר משותף) או #page=... (מהסימנייה בדף טאבים) */
export function readIncoming(): Incoming | null {
  const m = /^#(song|page)=(.+)$/.exec(window.location.hash)
  if (m) return { kind: m[1] as 'song' | 'page', data: m[2] }
  // שיתוף מאנדרואיד (Share > Harmonica Coach): הטקסט מגיע בפרמטרים של הכתובת
  const q = new URLSearchParams(window.location.search)
  const text = q.get('text')
  if (text) return { kind: 'text', data: text, title: q.get('title') ?? '' }
  return null
}

const tag = (n: string) => {
  const f = findHole(n)[0]
  return f ? `${f.hole}${f.action === 'blow' ? '↑' : '↓'}` : n
}

type Draft = { title: string; notes: string[]; beats?: number[]; lyrics: string[]; phrases?: number[] }

/** מסך אישור לשיר שהגיע מקישור או מהסימנייה: רואים תצוגה מקדימה ושומרים */
export function IncomingScreen({ incoming, onSave, onCancel }: { incoming: Incoming; onSave: (s: CustomSong) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (incoming.kind === 'song') {
          const s = await unpackJson<CustomSong>(incoming.data)
          if (!Array.isArray(s.notes) || !s.notes.length || s.notes.some((n) => !findHole(n).length)) throw new Error('הקישור פגום')
          if (alive) { setDraft({ title: s.title, notes: s.notes, beats: s.beats, lyrics: s.lyrics ?? [], phrases: s.phrases }); setTitle(s.title) }
        } else {
          const r = incoming.kind === 'text'
            ? parsePageText(incoming.title ?? '', incoming.data)
            : await (async () => { const p = await unpackJson<{ t: string; l: string[] }>(incoming.data); return parsePageLines(p.t ?? '', p.l ?? []) })()
          if ('error' in r) throw new Error(r.error)
          const hasLyrics = r.lyrics.some(Boolean)
          if (alive) { setDraft({ title: r.title, notes: r.notes, lyrics: hasLyrics ? r.lyrics : [], phrases: r.phrases }); setTitle(r.title) }
        }
      } catch (e) {
        if (alive) setErr((e as Error).message || 'לא הצלחתי לקרוא את הקישור')
      }
    })()
    return () => { alive = false }
  }, [incoming])

  if (err) return <div className="card"><h2>שגיאה</h2><div className="warn">{err}</div><button className="btn" onClick={onCancel}>חזרה</button></div>
  if (!draft) return <div className="card"><p>טוען את השיר...</p></div>

  const first = draft.phrases ? draft.notes.slice(0, draft.phrases[0]) : draft.notes.slice(0, 12)
  return (
    <div className="card">
      <h2>שיר חדש</h2>
      <label className="field">שם השיר<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="sub">
        {draft.notes.length} צלילים{draft.phrases ? ` · ${draft.phrases.length} שורות` : ''}{draft.lyrics.some(Boolean) ? ' · עם מילים' : ' · בלי מילים'}
      </div>
      {draft.lyrics[0] && <div className="ltext">{draft.lyrics[0]}</div>}
      <div className="lholes" dir="ltr">{first.map((n, i) => <span key={i} className="hc">{tag(n)}</span>)}</div>
      <div className="row">
        <button className="btn primary" disabled={!title.trim()} onClick={() => onSave({ id: 'c' + Date.now(), title: title.trim(), notes: draft.notes, beats: draft.beats, lyrics: draft.lyrics, phrases: draft.phrases })}>שמור שיר</button>
        <button className="btn" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  )
}

/** הסבר והכפתור לגרירה לשורת הסימניות */
export function PageHelp({ onBack }: { onBack: () => void }) {
  const a = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    const base = window.location.origin + window.location.pathname
    a.current?.setAttribute('href', bookmarklet(base))
  }, [])
  return (
    <div className="card">
      <h2>הוספת שיר מדף טאבים</h2>
      <p className="sub">עושים את זה פעם אחת במחשב. אחר כך, בכל דף עם טאבים של מפוחית (שורת מספרים ומתחתיה המילים), לוחצים על הסימנייה והשיר נכנס לאפליקציה, עם המילים. הכול מתבצע בדפדפן שלך.</p>
      <ol className="steps-list">
        <li>הצג את שורת הסימניות ב-Chrome: Ctrl+Shift+B.</li>
        <li>גרור את הכפתור הזה אל שורת הסימניות: <a ref={a} className="btn primary bm" onClick={(e) => e.preventDefault()}>➕ הוסף לאפליקציית המפוחית</a></li>
        <li>פתח דף שיר עם טאבים (למשל שורה של מספרים כמו <b dir="ltr">-4 5 -5 6</b> ומתחתיה המילים) ולחץ על הסימנייה.</li>
        <li>תיפתח האפליקציה עם תצוגה מקדימה. לחץ "שמור שיר".</li>
      </ol>
      <p className="sub">מינוס לפני המספר = שאיפה, בלי מינוס = נשיפה.</p>
      <button className="btn" onClick={onBack}>חזרה</button>
    </div>
  )
}
