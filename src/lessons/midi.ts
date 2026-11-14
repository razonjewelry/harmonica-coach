import { LAYOUT, midiToNote, noteToMidi } from '../harmonica/notes'

export interface MidiNote { tick: number; dur: number; pitch: number }
export interface MidiTrack { index: number; name: string; notes: MidiNote[] }
export interface LyricEvent { tick: number; text: string }
export interface ParsedMidi { ppq: number; bpm: number; tracks: MidiTrack[]; lyrics: LyricEvent[]; title: string }

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try { return new TextDecoder('windows-1255').decode(bytes) } catch { return new TextDecoder('latin1').decode(bytes) }
  }
}

/** קורא קובץ MIDI/KAR סטנדרטי: צלילים, קצב, ומילים (אירועי Lyric או Text של קריוקי) */
export function parseMidi(buf: ArrayBuffer): ParsedMidi {
  const d = new Uint8Array(buf)
  const dv = new DataView(buf)
  let p = 0
  const str = (n: number) => { const s = String.fromCharCode(...d.slice(p, p + n)); p += n; return s }
  if (str(4) !== 'MThd') throw new Error('זה לא קובץ MIDI')
  const hlen = dv.getUint32(p); p += 4
  p += 2 // format
  const ntrks = dv.getUint16(p); p += 2
  const division = dv.getUint16(p); p += 2
  p += hlen - 6
  if (division & 0x8000) throw new Error('פורמט זמן SMPTE לא נתמך')
  const ppq = division
  let bpm = 0
  const tracks: MidiTrack[] = []
  const lyricEv: LyricEvent[] = []
  const textEv: LyricEvent[] = []
  let title = ''

  for (let t = 0; t < ntrks && p < d.length; t++) {
    if (str(4) !== 'MTrk') throw new Error('מבנה קובץ לא תקין')
    const len = dv.getUint32(p); p += 4
    const end = Math.min(d.length, p + len)
    let tick = 0, running = 0, name = ''
    const on = new Map<number, number>()
    const notes: MidiNote[] = []
    const varlen = () => { let v = 0, b: number; do { b = d[p++]; v = (v << 7) | (b & 0x7f) } while (b & 0x80 && p < end); return v }
    while (p < end) {
      tick += varlen()
      let st = d[p]
      if (st < 0x80) st = running; else { p++; if (st < 0xf0) running = st }
      if (st === 0xff) {
        const type = d[p++]
        const l = varlen()
        const data = d.slice(p, p + l)
        p += l
        if (type === 0x51 && l === 3 && !bpm) bpm = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]))
        else if (type === 0x03) { name = decodeText(data); if (!title && t === 0) title = name }
        else if (type === 0x05) lyricEv.push({ tick, text: decodeText(data) })
        else if (type === 0x01) textEv.push({ tick, text: decodeText(data) })
      } else if (st === 0xf0 || st === 0xf7) {
        p += varlen()
      } else {
        const hi = st >> 4, ch = st & 0x0f
        const a = d[p++]
        const b = hi === 0xc || hi === 0xd ? 0 : d[p++]
        if (ch === 9) continue // תופים
        const key = ch * 128 + a
        if (hi === 0x9 && b > 0) { if (!on.has(key)) on.set(key, tick) }
        else if (hi === 0x8 || (hi === 0x9 && b === 0)) {
          const s = on.get(key)
          if (s !== undefined) { notes.push({ tick: s, dur: Math.max(1, tick - s), pitch: a }); on.delete(key) }
        }
      }
    }
    p = end
    notes.sort((x, y) => x.tick - y.tick)
    tracks.push({ index: t, name, notes })
  }
  // קריוקי: אירועי Text שמתחילים ב-@ הם מטא-נתונים, לא מילים
  const kText = textEv.filter((e) => !e.text.startsWith('@'))
  const meta = textEv.find((e) => e.text.startsWith('@T'))
  if (meta) title = meta.text.slice(2).trim() || title
  const lyrics = (lyricEv.length ? lyricEv : kText).sort((x, y) => x.tick - y.tick)
  return { ppq, bpm: bpm || 100, tracks, lyrics, title }
}

/** מנגינה חד-קולית מתוך רצועה: בצלילים חופפים נשמר הגבוה */
export function monophonic(notes: MidiNote[]): MidiNote[] {
  const out: MidiNote[] = []
  for (const n of notes) {
    const last = out[out.length - 1]
    if (last && n.tick < last.tick + last.dur - 1) {
      if (n.tick === last.tick) { if (n.pitch > last.pitch) out[out.length - 1] = n; continue }
      last.dur = n.tick - last.tick
    }
    out.push({ ...n })
  }
  return out
}

/**
 * בוחר ברירת מחדל: הרצועה הכי "מנגינתית". ליווי (ארפג'ו, בס) מזוהה לפי קצב אחיד מאוד, טווח נמוך או המון צלילים,
 * ולכן מקבל ציון נמוך. מנגינה היא בדרך כלל בטווח אמצע-גבוה, עם מגוון משכים וכמה מאות צלילים.
 */
export function guessMelodyTrack(m: ParsedMidi): number {
  let best = -1, bestScore = 0
  for (const t of m.tracks) {
    if (t.notes.length < 8) continue
    const mono = monophonic(t.notes)
    const avg = mono.reduce((s, n) => s + n.pitch, 0) / mono.length
    const overlap = 1 - mono.length / t.notes.length
    const gaps = mono.slice(1).map((n, i) => n.tick - mono[i].tick)
    const freq = new Map<number, number>()
    gaps.forEach((g) => freq.set(g, (freq.get(g) ?? 0) + 1))
    const uniform = gaps.length ? Math.max(...freq.values()) / gaps.length : 1
    const range = avg >= 60 && avg <= 86 ? 1 : avg >= 52 ? 0.5 : 0.3
    const size = 1 / (1 + mono.length / 600)
    const nameBonus = /melod|vocal|voice|lead|canto|soprano|שיר|מנגינ/i.test(t.name) ? 2 : 1
    const score = range * Math.max(0.02, 1 - uniform) * (1 - overlap) * size * nameBonus * (1 + avg / 200)
    if (score > bestScore) { bestScore = score; best = t.index }
  }
  return best
}

const AVAIL = new Set(Object.values(LAYOUT).flatMap((h) => [noteToMidi(h.blow), noteToMidi(h.draw)]))
const AVAIL_LIST = [...AVAIL].sort((a, b) => a - b)

function nearest(p: number): number {
  let best = AVAIL_LIST[0]
  for (const a of AVAIL_LIST) if (Math.abs(a - p) < Math.abs(best - p) || (Math.abs(a - p) === Math.abs(best - p) && a < best)) best = a
  return best
}

export interface BuiltSong {
  notes: string[]
  beats: number[]
  bpm: number
  lyrics?: string[]
  phrases?: number[]
  /** הזזה בחצאי טונים כדי להתאים למפוחית C */
  shift: number
  /** כמה אחוז מהצלילים מנוגנים בדיוק (השאר מקורבים לצליל הקרוב במפוחית) */
  exactPct: number
}

export function buildSong(m: ParsedMidi, trackIndex: number): BuiltSong {
  const mono = monophonic(m.tracks.find((t) => t.index === trackIndex)?.notes ?? [])
  if (!mono.length) throw new Error('ברצועה הזו אין צלילים')
  // הזזה (כולל אוקטבות) שמתאימה למספר הגדול ביותר של צלילים בדיוק
  let shift = 0, bestScore = -1
  for (let s = -24; s <= 24; s++) {
    const score = mono.filter((n) => AVAIL.has(n.pitch + s)).length
    if (score > bestScore || (score === bestScore && Math.abs(s) < Math.abs(shift))) { bestScore = score; shift = s }
  }
  const pitches = mono.map((n) => nearest(n.pitch + shift))
  const exact = mono.filter((n) => AVAIL.has(n.pitch + shift)).length
  const notes = pitches.map(midiToNote)
  // משך = מרחק עד תחילת הצליל הבא (הפסקות נספגות), מעוגל לרבע פעימה
  const beats = mono.map((n, i) => {
    const gap = i + 1 < mono.length ? mono[i + 1].tick - n.tick : n.dur
    return Math.min(8, Math.max(0.25, Math.round((gap / m.ppq) * 4) / 4))
  })

  const song: BuiltSong = { notes, beats, bpm: Math.min(180, Math.max(50, m.bpm)), shift, exactPct: Math.round((exact / mono.length) * 100) }

  if (m.lyrics.length) {
    const tol = m.ppq / 4
    const text: string[] = mono.map(() => '')
    const brk: boolean[] = mono.map(() => false)
    let ni = 0
    for (const ev of m.lyrics) {
      let s = ev.text
      let nl = false
      if (s.startsWith('/') || s.startsWith('\\')) { nl = true; s = s.slice(1) }
      s = s.replace(/[\r\n]+/g, ' ')
      while (ni < mono.length - 1 && mono[ni].tick < ev.tick - tol) ni++
      if (nl) brk[ni] = true
      text[ni] += s
    }
    // פסוקיות: לפי סימוני שורה, ובנוסף אחרי הפסקה ארוכה
    const starts: number[] = [0]
    for (let i = 1; i < mono.length; i++) {
      const rest = (mono[i].tick - (mono[i - 1].tick + mono[i - 1].dur)) / m.ppq
      if (brk[i] || rest >= 2) starts.push(i)
    }
    const phrases: number[] = []
    const lines: string[] = []
    starts.forEach((s, k) => {
      const e = k + 1 < starts.length ? starts[k + 1] : mono.length
      phrases.push(e - s)
      lines.push(text.slice(s, e).join('').replace(/\s+/g, ' ').trim())
    })
    // שומרים רק אם באמת יש מילים
    if (lines.some((l) => l.length > 0)) { song.lyrics = lines.map((l) => l || '♪'); song.phrases = phrases }
  }
  return song
}
