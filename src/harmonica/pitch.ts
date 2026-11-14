import { freqToMidiFloat, midiToNote } from './notes'

export interface PitchResult {
  freq: number | null
  confidence: number // 0..1
  rms: number
}

/** YIN עם סף רעש. מחזיר freq=null כשאין צליל ברור. */
export function detectPitch(buf: Float32Array, sampleRate: number, opts: { minRms?: number; threshold?: number } = {}): PitchResult {
  const minRms = opts.minRms ?? 0.01
  const threshold = opts.threshold ?? 0.12
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  const rms = Math.sqrt(sum / buf.length)
  if (rms < minRms) return { freq: null, confidence: 0, rms }

  const half = Math.floor(buf.length / 2)
  const minTau = Math.floor(sampleRate / 2200)
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / 180))
  const d = new Float32Array(maxTau + 2)
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0
    for (let i = 0; i < half; i++) { const x = buf[i] - buf[i + tau]; s += x * x }
    d[tau] = s
  }
  const cm = new Float32Array(maxTau + 2)
  cm[0] = 1
  let run = 0
  for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; cm[tau] = run === 0 ? 1 : (d[tau] * tau) / run }

  let tau = -1
  for (let t = minTau; t <= maxTau; t++) {
    if (cm[t] < threshold) { while (t + 1 <= maxTau && cm[t + 1] < cm[t]) t++; tau = t; break }
  }
  if (tau < 0) return { freq: null, confidence: 0, rms }
  const a = cm[tau - 1], b = cm[tau], c = tau + 1 <= maxTau ? cm[tau + 1] : cm[tau]
  const denom = a + c - 2 * b
  const shift = denom === 0 ? 0 : (a - c) / (2 * denom)
  return { freq: sampleRate / (tau + shift), confidence: Math.max(0, Math.min(1, 1 - cm[tau])), rms }
}

export interface NoteMatch { note: string; cents: number }
export function matchNote(freq: number): NoteMatch {
  const m = freqToMidiFloat(freq), r = Math.round(m)
  return { note: midiToNote(r), cents: Math.round((m - r) * 100) }
}

/** יציבות: צליל נחשב מזוהה רק אחרי N פריימים רצופים באותו תו, בביטחון מספיק ובסטייה קטנה. */
export class StabilityTracker {
  private last: string | null = null
  private count = 0
  private need: number
  private minConf: number
  private maxCents: number
  constructor(need = 5, minConf = 0.85, maxCents = 35) {
    this.need = need
    this.minConf = minConf
    this.maxCents = maxCents
  }
  push(r: PitchResult): NoteMatch | null {
    if (r.freq === null || r.confidence < this.minConf) { this.reset(); return null }
    const m = matchNote(r.freq)
    if (Math.abs(m.cents) > this.maxCents) { this.reset(); return null }
    if (m.note === this.last) this.count++; else { this.last = m.note; this.count = 1 }
    return this.count >= this.need ? m : null
  }
  reset() { this.last = null; this.count = 0 }
}
