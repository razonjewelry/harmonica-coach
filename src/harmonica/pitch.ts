import { freqToMidiFloat, midiToNote } from './notes'

export interface PitchResult {
  freq: number | null
  confidence: number // 0..1
  rms: number
}

/** מסנן ביקוואד דו-קוטבי (Butterworth). type: 'low' | 'high' */
function biquad(x: Float32Array, sr: number, fc: number, type: 'low' | 'high'): Float32Array {
  const w0 = (2 * Math.PI * fc) / sr
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2)
  let b0: number, b1: number, b2: number
  if (type === 'low') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2 } else { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2 }
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha
  const y = new Float32Array(x.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v
  }
  return y
}

/** מסנן פס 200-2800Hz: מוריד רעשי רקע, נשימה ושריקות מחוץ לתחום המפוחית (262-2093Hz) */
export function bandpass(buf: Float32Array, sampleRate: number): Float32Array {
  return biquad(biquad(buf, sampleRate, 190, 'high'), sampleRate, 2800, 'low')
}

/** YIN עם סינון רעש. מחזיר freq=null כשאין צליל ברור. */
export function detectPitch(raw: Float32Array, sampleRate: number, opts: { minRms?: number; threshold?: number; floor?: number } = {}): PitchResult {
  const minRms = opts.minRms ?? 0.003
  const threshold = opts.threshold ?? 0.15
  const floor = opts.floor ?? 0.35
  const buf = bandpass(raw, sampleRate)
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  const rms = Math.sqrt(sum / buf.length)
  if (rms < minRms) return { freq: null, confidence: 0, rms }

  const half = Math.floor(buf.length / 2)
  const minTau = Math.max(2, Math.floor(sampleRate / 2500))
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / 220))
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
  if (tau < 0) {
    // בלי ירידה מתחת לסף: ניקח את המינימום הכללי אם הוא טוב מספיק (צליל נשימתי)
    let best = minTau
    for (let t = minTau; t <= maxTau; t++) if (cm[t] < cm[best]) best = t
    if (cm[best] > floor) return { freq: null, confidence: 0, rms }
    tau = best
  }
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

/**
 * יציבות: צליל מאושר רק אחרי N פריימים באותו תו, בביטחון מספיק ובסטייה קטנה.
 * מותר פריים אחד שנפל באמצע (נשימה), שני פריימים רצופים מאפסים.
 */
export class StabilityTracker {
  private last: string | null = null
  private count = 0
  private misses = 0
  private need: number
  private minConf: number
  private maxCents: number
  constructor(need = 4, minConf = 0.7, maxCents = 40) {
    this.need = need
    this.minConf = minConf
    this.maxCents = maxCents
  }
  push(r: PitchResult): NoteMatch | null {
    const ok = r.freq !== null && r.confidence >= this.minConf
    const m = ok ? matchNote(r.freq as number) : null
    if (!m || Math.abs(m.cents) > this.maxCents) {
      this.misses++
      if (this.misses >= 2) this.reset()
      return this.count >= this.need && this.last ? { note: this.last, cents: 0 } : null
    }
    this.misses = 0
    if (m.note === this.last) this.count++; else { this.last = m.note; this.count = 1 }
    return this.count >= this.need ? m : null
  }
  reset() { this.last = null; this.count = 0; this.misses = 0 }
}
