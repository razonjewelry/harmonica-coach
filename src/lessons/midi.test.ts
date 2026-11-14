import { describe, it, expect } from 'vitest'
import { parseMidi, buildSong, guessMelodyTrack, monophonic } from './midi'

const vl = (n: number): number[] => {
  const out = [n & 0x7f]
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80)
  return out
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const enc = (s: string) => [...new TextEncoder().encode(s)]
const meta = (delta: number, type: number, data: number[]) => [...vl(delta), 0xff, type, ...vl(data.length), ...data]
const track = (ev: number[]) => [...enc('MTrk'), ...u32(ev.length + 4), ...ev, 0, 0xff, 0x2f, 0]

/** שיר בסולם רה מז'ור, רבעים, עם מילים */
function makeMidi(pitches: number[], words: string[], lyricType = 0x05): ArrayBuffer {
  const ppq = 480
  const t0 = [...meta(0, 0x51, [0x07, 0xa1, 0x20]), ...meta(0, 0x03, enc('Test Song'))]
  const ev: number[] = []
  pitches.forEach((p, i) => {
    if (words[i] !== undefined) ev.push(...meta(0, lyricType, enc(words[i])))
    ev.push(0, 0x90, p, 90, ...vl(ppq), 0x80, p, 0)
  })
  const header = [...enc('MThd'), ...u32(6), 0, 1, 0, 2, (ppq >> 8) & 255, ppq & 255]
  return new Uint8Array([...header, ...track(t0), ...track(ev)]).buffer
}

describe('ייבוא MIDI', () => {
  const dMajor = [62, 64, 66, 67, 69, 71, 73, 74]
  it('קורא צלילים, קצב, כותרת ומילים', () => {
    const m = parseMidi(makeMidi(dMajor, ['שיר ', 'של ', 'שמ', 'חה ', '/ב', 'לב ', 'כו', 'לנו']))
    expect(m.bpm).toBe(120)
    expect(m.title).toBe('Test Song')
    expect(m.ppq).toBe(480)
    const t = m.tracks[1]
    expect(t.notes.map((n) => n.pitch)).toEqual(dMajor)
    expect(m.lyrics.length).toBe(8)
    expect(m.lyrics[0].text).toBe('שיר ')
  })
  it('מזיז שיר ברה מז׳ור למפוחית C בדיוק מלא', () => {
    const m = parseMidi(makeMidi(dMajor, []))
    const s = buildSong(m, 1)
    expect(s.shift).toBe(10) // הזזה למעלה: F4 לא קיים במפוחית, ולכן הזזה של -2 הייתה מפספסת
    expect(s.exactPct).toBe(100)
    expect(s.notes).toEqual(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'])
    expect(s.beats).toEqual(Array(8).fill(1))
  })
  it('מחלק מילים לשורות לפי סימון /', () => {
    const s = buildSong(parseMidi(makeMidi(dMajor, ['שיר ', 'של ', 'שמ', 'חה ', '/ב', 'לב ', 'כו', 'לנו'])), 1)
    expect(s.phrases).toEqual([4, 4])
    expect(s.lyrics).toEqual(['שיר של שמחה', 'בלב כולנו'])
  })
  it('קריוקי KAR: מילים באירועי Text ומטא-נתונים עם @ לא נספרים', () => {
    const m = parseMidi(makeMidi(dMajor, ['@LHE', 'a ', 'b ', 'c '], 0x01))
    expect(m.lyrics.map((l) => l.text)).toEqual(['a ', 'b ', 'c '])
  })
  it('בוחר רצועת מנגינה ולא את רצועת הקצב', () => {
    expect(guessMelodyTrack(parseMidi(makeMidi(dMajor.concat(dMajor), [])))).toBe(1)
  })
  it('צלילים חופפים: נשמר הגבוה', () => {
    const r = monophonic([{ tick: 0, dur: 100, pitch: 60 }, { tick: 0, dur: 100, pitch: 64 }])
    expect(r).toHaveLength(1)
    expect(r[0].pitch).toBe(64)
  })
  it('קובץ שאינו MIDI נדחה', () => {
    expect(() => parseMidi(new TextEncoder().encode('hello world').buffer as ArrayBuffer)).toThrow()
  })
})
