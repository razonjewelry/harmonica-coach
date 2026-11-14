import { describe, it, expect } from 'vitest'
import { LAYOUT, noteToFreq, holeNote, findHole } from './notes'
import { detectPitch, matchNote, StabilityTracker } from './pitch'

const SR = 44100, N = 4096
const tone = (freqs: number[], amp = 0.3, noise = 0) => {
  const b = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    let v = 0
    for (const f of freqs) v += Math.sin((2 * Math.PI * f * i) / SR) + 0.3 * Math.sin((4 * Math.PI * f * i) / SR)
    b[i] = (freqs.length ? (amp * v) / freqs.length : 0) + noise * (Math.random() * 2 - 1)
  }
  return b
}

describe('מיפוי מפוחית C', () => {
  it('חור 4: נשיפה C5, שאיפה D5', () => { expect(holeNote(4, 'blow')).toBe('C5'); expect(holeNote(4, 'draw')).toBe('D5') })
  it('יש 10 חורים', () => { expect(Object.keys(LAYOUT)).toHaveLength(10) })
  it('כל הצלילים בסולם C מז׳ור', () => {
    const ok = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    for (const h of Object.values(LAYOUT)) {
      expect(ok.has(h.blow.replace(/\d/, ''))).toBe(true)
      expect(ok.has(h.draw.replace(/\d/, ''))).toBe(true)
    }
  })
  it('תדרים: C5 ≈ 523.25, A4 = 440', () => { expect(noteToFreq('C5')).toBeCloseTo(523.25, 1); expect(noteToFreq('A4')).toBeCloseTo(440, 5) })
  it('G4 מופיע בחור 2 שאיפה ובחור 3 נשיפה', () => { expect(findHole('G4')).toHaveLength(2) })
})

describe('זיהוי גובה צליל', () => {
  it('מזהה כל צליל במפוחית', () => {
    for (const h of Object.values(LAYOUT)) for (const n of [h.blow, h.draw]) {
      const r = detectPitch(tone([noteToFreq(n)]), SR)
      expect(r.freq, n).not.toBeNull()
      expect(matchNote(r.freq!).note, n).toBe(n)
    }
  })
  it('שקט = אין זיהוי', () => { expect(detectPitch(new Float32Array(N), SR).freq).toBeNull() })
  it('רעש לבן לא נחשב הצלחה', () => {
    const t = new StabilityTracker(); let hit = false
    for (let k = 0; k < 20; k++) hit = !!t.push(detectPitch(tone([], 0, 0.3), SR)) || hit
    expect(hit).toBe(false)
  })
  it('אקורד (C+E+G) לא נחשב הצלחה', () => {
    const t = new StabilityTracker(); let hit = false
    for (let k = 0; k < 20; k++) hit = !!t.push(detectPitch(tone([noteToFreq('C5'), noteToFreq('E5'), noteToFreq('G5')]), SR)) || hit
    expect(hit).toBe(false)
  })
  it('צליל נקי עם רעש קל מזוהה ויציב', () => {
    const t = new StabilityTracker(); let res: { note: string } | null = null
    for (let k = 0; k < 8; k++) res = t.push(detectPitch(tone([noteToFreq('E5')], 0.3, 0.02), SR))
    expect(res?.note).toBe('E5')
  })
  it('צליל שחוק בגובה (50 סנט) לא מאושר', () => {
    const t = new StabilityTracker(); let hit = false
    const f = noteToFreq('C5') * Math.pow(2, 0.5 / 12)
    for (let k = 0; k < 10; k++) hit = !!t.push(detectPitch(tone([f]), SR)) || hit
    expect(hit).toBe(false)
  })
})
