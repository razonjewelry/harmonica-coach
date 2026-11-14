import { describe, it, expect } from 'vitest'
import { noteToFreq, LAYOUT } from './notes'
import { targetSpectral } from './spectrum'

const SR = 48000, N = 4096
/** צליל קנה: amps = משקלי ההרמוניות (כולל מקרים שההרמוניה השנייה חזקה מהבסיס) */
const sig = (freqs: number[], amps = [1, 0.6, 0.3], noise = 0, level = 0.2) => {
  const b = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    let v = 0
    for (const f of freqs) amps.forEach((a, k) => { v += a * Math.sin((2 * Math.PI * f * (k + 1) * i) / SR) })
    b[i] = (level * v) / Math.max(1, freqs.length) + noise * level * (Math.random() * 2 - 1)
  }
  return b
}
const all = Object.values(LAYOUT).flatMap((h) => [h.blow, h.draw])

describe('אימות ספקטרלי של הצליל המבוקש', () => {
  it('מזהה כל צליל, גם כשההרמוניה השנייה חזקה מהבסיס (למשל שאיפה בחור 6)', () => {
    for (const n of all) {
      const f = noteToFreq(n)
      expect(targetSpectral(sig([f], [1, 0.6, 0.3], 0.4), SR, f), n + ' רגיל').toBe(true)
      expect(targetSpectral(sig([f], [0.5, 1, 0.4], 0.4), SR, f), n + ' הרמוניה 2 חזקה').toBe(true)
    }
  })
  it('צליל אחר, אקורד ורעש לא מאושרים', () => {
    for (const n of all) {
      const f = noteToFreq(n)
      expect(targetSpectral(sig([], [1], 1), SR, f), n + ' רעש').toBe(false)
    }
    const chord = [noteToFreq('C5'), noteToFreq('E5'), noteToFreq('G5')]
    for (const t of chord) expect(targetSpectral(sig(chord), SR, t)).toBe(false)
    expect(targetSpectral(sig([noteToFreq('E5')]), SR, noteToFreq('F5'))).toBe(false)
    expect(targetSpectral(sig([noteToFreq('A5')]), SR, noteToFreq('G5'))).toBe(false)
  })
  it('אוקטבה אחרת לא מאושרת', () => {
    expect(targetSpectral(sig([noteToFreq('A6')]), SR, noteToFreq('A5'))).toBe(false)
    expect(targetSpectral(sig([noteToFreq('A4')]), SR, noteToFreq('A5'))).toBe(false)
    expect(targetSpectral(sig([noteToFreq('C5')], [1, 0.9, 0.5]), SR, noteToFreq('C6'))).toBe(false)
  })
})
