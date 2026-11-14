import { describe, it, expect } from 'vitest'
import { noteToFreq, LAYOUT } from './notes'
import { OnsetDetector, TargetVote, targetPeriodicity, bandpass } from './pitch'
import { parseTab, countSyllables } from '../lessons/tab'

const SR = 48000, N = 4096
const sig = (freqs: number[], noise = 0, amp = 0.2) => {
  const b = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    let v = 0
    for (const f of freqs) v += Math.sin((2 * Math.PI * f * i) / SR) + 0.6 * Math.sin((4 * Math.PI * f * i) / SR) + 0.3 * Math.sin((6 * Math.PI * f * i) / SR)
    b[i] = (amp * v) / Math.max(1, freqs.length) + noise * amp * (Math.random() * 2 - 1)
  }
  return bandpass(b, SR)
}
const all = Object.values(LAYOUT).flatMap((h) => [h.blow, h.draw])

describe('אימות הצליל המבוקש', () => {
  it('מזהה את הצליל הנכון בכל 20 הצלילים, גם עם רעש נשימה', () => {
    for (const n of all) expect(targetPeriodicity(sig([noteToFreq(n)], 0.5), SR, noteToFreq(n)), n).toBeGreaterThan(0.75)
  })
  it('צליל אחר לא מאושר כמבוקש', () => {
    expect(targetPeriodicity(sig([noteToFreq('E5')]), SR, noteToFreq('F5'))).toBeLessThan(0.75)
    expect(targetPeriodicity(sig([noteToFreq('C6')]), SR, noteToFreq('C5'))).toBe(0)
  })
  it('אקורד ורעש לא מאושרים', () => {
    const chord = sig([noteToFreq('C5'), noteToFreq('E5'), noteToFreq('G5')])
    for (const n of ['C5', 'E5', 'G5']) expect(targetPeriodicity(chord, SR, noteToFreq(n)), n).toBeLessThan(0.75)
    for (const n of all) expect(targetPeriodicity(sig([], 1), SR, noteToFreq(n)), n).toBeLessThan(0.75)
  })
  it('הצבעת רוב דורשת 3 פריימים', () => {
    const v = new TargetVote()
    expect([v.push('C5', 0.9), v.push('C5', 0.9), v.push('C5', 0.9)]).toEqual([false, false, true])
    expect(v.push('D5', 0.9)).toBe(false)
  })
})

describe('זיהוי תחילת צליל', () => {
  it('דעיכה וחזרה = תחילת צליל; עוצמה יציבה = לא', () => {
    const d = new OnsetDetector()
    const env = [1, 1, 1, 1, 1, 1, 0.3, 0.2, 0.3, 0.9, 1, 1]
    const hits = env.map((x) => d.push(x * 0.1))
    expect(hits.indexOf(true)).toBe(9)
    const d2 = new OnsetDetector()
    expect([1, 0.95, 1, 0.9, 1, 1, 0.95, 1].map((x) => d2.push(x * 0.1)).some(Boolean)).toBe(false)
  })
  it('התחלה משקט לא נחשבת כתחילת צליל חוזר', () => {
    const d = new OnsetDetector()
    expect([0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.08, 0.1].map((x) => d.push(x)).some(Boolean)).toBe(false)
  })
})

describe('טאבים', () => {
  it('מפרש נשיפה ושאיפה', () => { expect(parseTab('4+ 4- 6+').notes).toEqual(['C5', 'D5', 'G5']) })
  it('שגיאה בחור לא קיים ובפורמט שגוי', () => {
    expect(parseTab('11+').error).toContain('11')
    expect(parseTab('abc').error).toContain('abc')
  })
  it('ספירת הברות', () => { expect(countSyllables(['א-ב ג', 'ד'])).toBe(4) })
})

describe('קצב בשירים', () => {
  it('טאבים עם משך: 6+:2', () => {
    const p = parseTab('4+ 6+:2 5-:0.5')
    expect(p.beats).toEqual([1, 2, 0.5])
    expect(p.notes).toEqual(['C5', 'G5', 'F5'])
  })
})

describe('טאבים לפי פסוקיות', () => {
  it('שורה חדשה וקו | מסיימים פסוקית', () => {
    expect(parseTab('4+ 4+ 6+\n6- 6-').phrases).toEqual([3, 2])
    expect(parseTab('4+ 4+ | 6+ 6- 5+').phrases).toEqual([2, 3])
    expect(parseTab('4+ 5-').phrases).toEqual([2])
  })
  it('שורות ריקות מתעלמים מהן', () => {
    expect(parseTab('4+ 4+\n\n6+').phrases).toEqual([2, 1])
  })
})
