import { useState } from 'react'
import { MELODIES } from '../lessons/melodies'
import { parseTab, loadSongs, saveSongs, countSyllables } from '../lessons/tab'
import type { CustomSong } from '../lessons/tab'
import { NotePlayer } from './NotePlayer'
import { parseMidi, buildSong, guessMelodyTrack } from '../lessons/midi'
import type { ParsedMidi, BuiltSong } from '../lessons/midi'
import { playMelody, stopPlayback } from '../audio/tone'
import { findHole } from '../harmonica/notes'
import { IncomingScreen, PageHelp } from './LinkImport'
import type { Incoming } from './LinkImport'
import { songLink } from '../lessons/share'

function SongForm({ onSave, onCancel }: { onSave: (s: CustomSong) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState('')
  const [lyrics, setLyrics] = useState('')
  const parsed = tab.trim() ? parseTab(tab) : null
  const lines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean)
  const syl = countSyllables(lines)
  const lineMode = !!parsed && !parsed.error && lines.length > 1 && parsed.phrases.length === lines.length
  const mismatch = !!parsed && !parsed.error && lines.length > 0 && !lineMode && syl !== parsed.notes.length
  const canSave = !!title.trim() && !!parsed && !parsed.error && !mismatch
  return (
    <div className="card">
      <h2>הוספת שיר משלי</h2>
      <p className="sub">השיר נשמר רק בטלפון שלך. כתוב את הצלילים לפי חורים: מספר חור ואז + לנשיפה או - לשאיפה.</p>
      <label className="field">שם השיר<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="field">צלילים (טאבים), שורה לכל פסוקית, למשל 4+ 4+ 6+ 6+ 6- 6-. לצליל ארוך: 6+:2
        <textarea dir="ltr" rows={3} value={tab} onChange={(e) => setTab(e.target.value)} />
      </label>
      {parsed?.error && <div className="warn">{parsed.error}</div>}
      {parsed && !parsed.error && <div className="sub">{parsed.notes.length} צלילים</div>}
      <label className="field">מילים (לא חובה). הדבק שורה לכל פסוקית (כמו שהן באתר). אם בטאבים יש שורה לכל פסוקית, האפליקציה תציג כל שורת מילים עם החורים שלה
        <textarea rows={4} value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
      </label>
      {lines.length > 0 && parsed && !parsed.error && (
        <div className={mismatch ? 'warn' : 'sub'}>{lineMode ? `מצב שורות: ${lines.length} שורות מילים מול ${parsed.phrases.length} פסוקיות בטאבים` : mismatch ? `${lines.length} שורות מילים מול ${parsed.phrases.length} פסוקיות בטאבים. כדי שיתאים: שורה אחת בטאבים (או קו |) לכל שורת מילים` : `${syl} הברות מול ${parsed.notes.length} צלילים`}</div>
      )}
      <div className="row">
        <button className="btn primary" disabled={!canSave} onClick={() => onSave({ id: 'c' + Date.now(), title: title.trim(), notes: parsed!.notes, beats: parsed!.beats, lyrics: lines, phrases: lineMode ? parsed!.phrases : undefined })}>שמור שיר</button>
        <button className="btn" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  )
}

/** ייבוא שיר מקובץ MIDI או KAR (קריוקי): צלילים, קצב ומילים מומרים אוטומטית לחורי המפוחית */
function ImportSong({ onSave, onCancel }: { onSave: (s: CustomSong) => void; onCancel: () => void }) {
  const [midi, setMidi] = useState<ParsedMidi | null>(null)
  const [track, setTrack] = useState(-1)
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(false)

  const built: BuiltSong | null = (() => {
    if (!midi || track < 0) return null
    try { return buildSong(midi, track) } catch { return null }
  })()

  const load = async (f: File | undefined) => {
    setErr('')
    if (!f) return
    try {
      const m = parseMidi(await f.arrayBuffer())
      setMidi(m)
      setTrack(guessMelodyTrack(m))
      setTitle(m.title.trim() ? m.title.trim() : f.name.replace(/\.(mid|midi|kar)$/i, ''))
    } catch (e) {
      setMidi(null)
      setErr((e as Error).message || 'לא הצלחתי לקרוא את הקובץ')
    }
  }
  const preview = () => {
    if (!built) return
    if (playing) { stopPlayback(); setPlaying(false); return }
    setPlaying(true)
    void playMelody(built.notes, built.beats, built.bpm, () => {}).done.then(() => setPlaying(false))
  }

  return (
    <div className="card">
      <h2>ייבוא שיר מקובץ</h2>
      <p className="sub">בחר קובץ MIDI או KAR (קריוקי) של השיר. האפליקציה ממירה אותו לחורי המפוחית, עם הקצב והמילים. הכול נשאר בטלפון שלך.</p>
      <input type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" onChange={(e) => void load(e.target.files?.[0])} />
      {err && <div className="warn">{err}</div>}
      {midi && (
        <>
          <label className="field">רצועת המנגינה
            <select value={track} onChange={(e) => setTrack(Number(e.target.value))}>
              {midi.tracks.filter((t) => t.notes.length > 0).map((t) => (
                <option key={t.index} value={t.index}>{t.name || `רצועה ${t.index + 1}`} · {t.notes.length} צלילים</option>
              ))}
            </select>
          </label>
          <label className="field">שם השיר<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          {built ? (
            <>
              <div className="sub">
                {built.notes.length} צלילים · {built.exactPct}% מדויקים{built.exactPct < 100 ? ' (השאר מקורבים לצליל הקרוב במפוחית)' : ''}
                {built.shift !== 0 ? ` · הוזז ${built.shift > 0 ? '+' : ''}${built.shift} חצאי טונים` : ''}
                {built.lyrics ? ` · ${built.lyrics.length} שורות מילים` : ' · בלי מילים בקובץ'}
              </div>
              <div className="lholes" dir="ltr" aria-label="תחילת השיר בטאבים">
                {built.notes.slice(0, 16).map((n, i) => {
                  const f = findHole(n)[0]
                  return <span key={i} className="hc">{f ? `${f.hole}${f.action === 'blow' ? '↑' : '↓'}` : n}</span>
                })}
                {built.notes.length > 16 && <span className="sub">…</span>}
              </div>
              {built.notes.length > 1200 && <div className="warn">הרצועה ארוכה מאוד ({built.notes.length} צלילים). כנראה זה ליווי ולא מנגינה. נסה רצועה אחרת.</div>}
              {built.exactPct < 70 && <div className="warn">רק {built.exactPct}% מהצלילים קיימים במפוחית C, אז השיר יישמע שונה. אפשר לנסות רצועה אחרת.</div>}
              <div className="row">
                <button className="btn" onClick={preview}>{playing ? '⏹ עצור' : '🔊 שמע'}</button>
                <button className="btn primary" disabled={!title.trim()} onClick={() => { stopPlayback(); onSave({ id: 'c' + Date.now(), title: title.trim(), notes: built.notes, beats: built.beats, lyrics: built.lyrics ?? [], phrases: built.phrases }) }}>שמור שיר</button>
              </div>
            </>
          ) : <div className="warn">לא נמצאו צלילים ברצועה הזו. בחר רצועה אחרת.</div>}
        </>
      )}
      <div className="row"><button className="btn" onClick={() => { stopPlayback(); onCancel() }}>ביטול</button></div>
    </div>
  )
}

interface Item { id: string; title: string; notes: string[]; lyrics?: string[]; beats?: number[]; bpm?: number; phrases?: number[]; mine?: boolean }

export function Melodies({ incoming, onIncomingDone }: { incoming?: Incoming | null; onIncomingDone?: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pageHelp, setPageHelp] = useState(false)
  const [pasted, setPasted] = useState<Incoming | null>(null)
  const [pasteBox, setPasteBox] = useState(false)
  const fromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) { setPasted({ kind: 'text', data: text }); return }
    } catch { /* אין הרשאה ללוח: נציג תיבת הדבקה */ }
    setPasteBox(true)
  }
  const [custom, setCustom] = useState<CustomSong[]>(() => loadSongs())
  const all: Item[] = [
    ...MELODIES,
    ...custom.map((c) => ({ ...c, lyrics: c.lyrics.length ? c.lyrics : undefined, mine: true })),
  ]
  const mel = all.find((m) => m.id === id)
  const persist = (c: CustomSong[]) => { setCustom(c); saveSongs(c) }
  const share = async (s: CustomSong) => {
    const url = await songLink(window.location.origin + window.location.pathname, s)
    try {
      if (navigator.share) await navigator.share({ title: s.title, url })
      else { await navigator.clipboard.writeText(url); alert('הקישור הועתק. שלח אותו לעצמך (וואטסאפ או מייל) ופתח אותו בטלפון.') }
    } catch { /* בוטל */ }
  }
  if (incoming) return <IncomingScreen incoming={incoming} onCancel={() => onIncomingDone?.()} onSave={(s) => { persist([...custom, s]); onIncomingDone?.() }} />
  if (pasted) return <IncomingScreen incoming={pasted} onCancel={() => setPasted(null)} onSave={(s) => { persist([...custom, s]); setPasted(null) }} />
  if (pasteBox) return (
    <div className="card">
      <h2>הדבק את הדף</h2>
      <p className="sub">לחיצה ארוכה בתיבה ואז "הדבק".</p>
      <textarea className="pastebox" rows={6} autoFocus onChange={(e) => { const v = e.target.value; if (v.trim().length > 10) { setPasteBox(false); setPasted({ kind: 'text', data: v }) } }} />
      <button className="btn" onClick={() => setPasteBox(false)}>ביטול</button>
    </div>
  )
  if (pageHelp) return <PageHelp onBack={() => setPageHelp(false)} />
  if (importing) return <ImportSong onCancel={() => setImporting(false)} onSave={(s) => { persist([...custom, s]); setImporting(false) }} />
  if (adding) return <SongForm onCancel={() => setAdding(false)} onSave={(s) => { persist([...custom, s]); setAdding(false) }} />
  if (!mel) {
    return (
      <div className="card">
        <h2>ספריית מנגינות</h2>
        <p className="sub">לחץ על שיר כדי לשמוע איך הוא הולך ולנגן אותו עם מילים.</p>
        {all.map((m) => (
          <div key={m.id} className="songrow">
            <button className="btn list" onClick={() => setId(m.id)}>{m.title} · {m.notes.length} צלילים</button>
            {m.mine && <button className="btn small" title="שלח לטלפון" onClick={() => void share(custom.find((c) => c.id === m.id)!)}>📤</button>}
            {m.mine && <button className="btn danger small" onClick={() => { if (confirm('למחוק את השיר?')) persist(custom.filter((c) => c.id !== m.id)) }}>🗑</button>}
          </div>
        ))}
        <button className="btn primary big" onClick={() => void fromClipboard()}>📋 הדבק שיר שהעתקת מדף טאבים</button>
        <button className="btn big" onClick={() => setImporting(true)}>📁 ייבא שיר מקובץ (MIDI / KAR)</button>
        {!window.matchMedia('(pointer: coarse)').matches && (
          <button className="btn big" onClick={() => setPageHelp(true)}>🔖 הוסף שיר מדף טאבים (סימנייה למחשב)</button>
        )}
        <button className="btn big" onClick={() => setAdding(true)}>➕ הוסף שיר ידנית</button>
      </div>
    )
  }
  return (
    <>
      <h2 className="pad">{mel.title}</h2>
      <NotePlayer key={mel.id + (mel.bpm ?? '') + (mel.beats?.join(',') ?? '')} notes={mel.notes} lyrics={mel.lyrics} beats={mel.beats} bpm={mel.bpm} phrases={mel.phrases}
        onRhythm={mel.mine ? (beats, bpm) => persist(custom.map((c) => (c.id === mel.id ? { ...c, beats, bpm } : c))) : undefined} />
      <div className="row"><button className="btn" onClick={() => setId(null)}>חזרה לרשימה</button></div>
    </>
  )
}
