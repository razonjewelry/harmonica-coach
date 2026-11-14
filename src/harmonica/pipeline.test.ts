import { describe, it, expect } from 'vitest'
import { noteToFreq } from './notes'
import { blockRms, bandpass, detectPitchFiltered, StabilityTracker, OnsetDetector, TargetVote, targetPeriodicity } from './pitch'
import { SequenceMatcher } from '../lessons/sequence'
import { MELODIES } from '../lessons/melodies'

const SR = 48000

/** נגינה סינתטית של שיר: כל צליל 0.45 שניות, בין צלילים דעיכה קצרה (או רצף ללא הפסקה), עם רעש נשימה */
function play(notes: string[], gapSec: number, noise: number, amp: number, floor = 0, harm = [1, 0.6, 0.35, 0.2]): Float32Array {
  const per = Math.floor(0.45 * SR), gap = Math.floor(gapSec * SR)
  const out = new Float32Array(notes.length * (per + gap) + SR / 2)
  let pos = Math.floor(SR * 0.3)
  for (const n of notes) {
    const f = noteToFreq(n)
    let ph = 0
    for (let i = 0; i < per; i++) {
      ph += (2 * Math.PI * f) / SR
      const edge = Math.min(1, i / (0.04 * SR)) * Math.min(1, (per - i) / (0.03 * SR)) // התחלה והפסקה רכות
      const env = floor + (1 - floor) * edge
      let v = 0
      ;harm.forEach((a, k) => { v += a * Math.sin(ph * (k + 1)) })
      out[pos + i] = amp * env * v + noise * amp * (Math.random() * 2 - 1)
    }
    pos += per + gap
  }
  return out
}

function run(sig: Float32Array, targets: string[]): number {
  const m = new SequenceMatcher(targets)
  const tr = new StabilityTracker(), on = new OnsetDetector(8, 4, 6), vote = new TargetVote()
  const step = Math.floor(SR * 0.04)
  for (let st = 0; st + 4096 <= sig.length && !m.done; st += step) {
    const f = bandpass(sig.subarray(st, st + 4096), SR)
    const r = detectPitchFiltered(f, SR)
    const stable = tr.push(r)
    const t = m.target
    const hit = t ? vote.push(t, targetPeriodicity(f, SR, noteToFreq(t))) : vote.push(null, 0)
    m.push(stable ?? (hit && t ? { note: t, cents: 0 } : null), blockRms(f).map((v) => on.push(v)).some(Boolean), r.freq !== null && r.confidence >= 0.5)
  }
  return m.index
}

describe('צינור מלא: נגינה סינתטית של שירים', () => {
  const twinkle = MELODIES.find((x) => x.id === 'twinkle')!.notes
  it('כוכב קטן המלא עם הפסקות קצרות בין צלילים', () => {
    expect(run(play(twinkle, 0.12, 0.3, 0.15), twinkle)).toBe(twinkle.length)
  })
  it('כוכב קטן בנגינה רציפה כמעט בלי הפסקה (חזרות על אותו צליל)', () => {
    expect(run(play(twinkle, 0.06, 0.3, 0.15), twinkle)).toBe(twinkle.length)
  })
  it('חזרות על אותו צליל עם ירידת עוצמה בינונית (עד 35%) בין הצלילים', () => {
    const rep = ['F5', 'F5', 'E5', 'E5', 'D5', 'D5', 'G5', 'G5', 'A5', 'A5']
    expect(run(play(rep, 0.0, 0.3, 0.15, 0.35), rep)).toBe(rep.length)
  })
  it('צליל חוזר בשאיפה בחור 6 ו-7 עם הרמוניה שנייה חזקה (לה לה לה, סי סי)', () => {
    const rep = ['A5', 'A5', 'A5', 'B5', 'B5']
    expect(run(play(rep, 0.0, 0.3, 0.15, 0.35, [0.5, 1, 0.4]), rep)).toBe(rep.length)
  })
  it('צליל אחד ארוך עם רעידות עוצמה טבעיות לא נספר פעמיים', () => {
    const n = 5, per = Math.floor(2.0 * SR)
    const sig = new Float32Array(per + SR)
    const f = noteToFreq('A5')
    let ph = 0
    for (let i = 0; i < per; i++) {
      ph += (2 * Math.PI * f) / SR
      const flutter = 1 + 0.15 * Math.sin((2 * Math.PI * 6 * i) / SR)
      const edge = Math.min(1, i / (0.04 * SR))
      sig[Math.floor(SR * 0.3) + i] = 0.15 * flutter * edge * (Math.sin(ph) + 0.6 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) + 0.03 * (Math.random() * 2 - 1)
    }
    void n
    expect(run(sig, ['A5', 'A5'])).toBe(1)
  })
  it('צלילים גבוהים (חורים 7-10) בעוצמה נמוכה ורעש', () => {
    const hi = ['C6', 'B5', 'E6', 'D6', 'G6', 'F6', 'C7', 'A6']
    expect(run(play(hi, 0.12, 0.5, 0.04), hi)).toBe(hi.length)
  })
  it('נגינה של צלילים אחרים לא מקדמת', () => {
    expect(run(play(['D5', 'E5', 'F5'], 0.12, 0.2, 0.15), ['C5', 'G5'])).toBe(0)
  })
})
