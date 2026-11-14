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
  return detectPitchFiltered(bandpass(raw, sampleRate), sampleRate, opts)
}

/** כמו detectPitch, על אות שכבר עבר סינון פס */
export function detectPitchFiltered(buf: Float32Array, sampleRate: number, opts: { minRms?: number; threshold?: number; floor?: number } = {}): PitchResult {
  const minRms = opts.minRms ?? 0.003
  const threshold = opts.threshold ?? 0.15
  const floor = opts.floor ?? 0.35
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

/**
 * האם הצליל המבוקש נשמע? בודק מחזוריות בדיוק באורך המחזור של הצליל המבוקש (±40 סנט).
 * מחזיר 0 אם האות מחזורי גם בחצי המחזור (כלומר צליל גבוה יותר) או אם שקט מדי.
 * עוזר בצלילים נשימתיים שהזיהוי הכללי מפספס, בלי לאשר אקורד, רעש או צליל אחר.
 */
export function targetPeriodicity(buf: Float32Array, sampleRate: number, targetFreq: number): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  if (Math.sqrt(sum / buf.length) < 0.003) return 0
  const half = Math.floor(buf.length / 2)
  const tauT = sampleRate / targetFreq
  const lo = Math.max(2, Math.floor(tauT * 0.9))
  const hi = Math.ceil(tauT * 1.1) + 1
  if (hi >= half) return 0
  const cm = new Float32Array(hi + 2)
  let run = 0
  for (let tau = 1; tau <= hi; tau++) {
    let d = 0
    for (let i = 0; i < half; i++) { const x = buf[i] - buf[i + tau]; d += x * x }
    run += d
    cm[tau] = run === 0 ? 1 : (d * tau) / run
  }
  // מינימום מקומי אמיתי סביב המחזור המבוקש, ובדיוק של עד 40 סנט
  let best = lo
  for (let t = lo; t <= hi; t++) if (cm[t] < cm[best]) best = t
  if (best === lo || best === hi) return 0
  const a = cm[best - 1], b = cm[best], c = cm[best + 1]
  const den = a + c - 2 * b
  const tauRef = best + (den === 0 ? 0 : (a - c) / (2 * den))
  const cents = 1200 * Math.log2(sampleRate / tauRef / targetFreq)
  if (Math.abs(cents) > 40) return 0
  // אם האות מחזורי גם בחצי מחזור, הצליל בעצם גבוה יותר
  let upper = 1
  for (let t = Math.max(2, Math.floor(tauT * 0.45)); t <= Math.ceil(tauT * 0.55); t++) upper = Math.min(upper, cm[t])
  return 1 - upper > 0.6 ? 0 : 1 - b
}

export interface NoteMatch { note: string; cents: number }
export function matchNote(freq: number): NoteMatch {
  const m = freqToMidiFloat(freq), r = Math.round(m)
  return { note: midiToNote(r), cents: Math.round((m - r) * 100) }
}

/**
 * יציבות בהצבעת רוב: צליל מאושר כשאותו תו מופיע לפחות 3 פעמים מתוך 6 הפריימים האחרונים,
 * בביטחון מספיק ובסטייה של עד 45 סנט. עמיד לפריימים בודדים רועשים (צלילים גבוהים ונשימתיים).
 * אקורד, רעש וצליל לא ברור מפזרים את הקולות ולכן לא מאושרים.
 */
export class StabilityTracker {
  private win: (NoteMatch | null)[] = []
  private size: number
  private need: number
  private minConf: number
  private maxCents: number
  constructor(need = 3, minConf = 0.5, maxCents = 45, size = 6) {
    this.need = need
    this.minConf = minConf
    this.maxCents = maxCents
    this.size = size
  }
  push(r: PitchResult): NoteMatch | null {
    let e: NoteMatch | null = null
    if (r.freq !== null && r.confidence >= this.minConf) {
      const m = matchNote(r.freq)
      if (Math.abs(m.cents) <= this.maxCents) e = m
    }
    this.win.push(e)
    if (this.win.length > this.size) this.win.shift()
    const votes = new Map<string, number[]>()
    for (const x of this.win) if (x) votes.set(x.note, [...(votes.get(x.note) ?? []), x.cents])
    let best: string | null = null
    for (const [n, c] of votes) if (c.length >= this.need && (best === null || c.length > (votes.get(best)?.length ?? 0))) best = n
    if (best === null) return null
    const cs = [...(votes.get(best) as number[])].sort((a, b) => a - b)
    return { note: best, cents: cs[Math.floor(cs.length / 2)] }
  }
  reset() { this.win = [] }
}

/**
 * זיהוי תחילת צליל חדש לפי ירידה וחזרה בעוצמה. מאפשר לנגן אותו צליל פעמיים ברצף
 * (למשל סול סול) גם בלי שקט מלא ביניהם.
 */
export class OnsetDetector {
  private h: number[] = []
  private cool = 0
  private look: number
  private tail: number
  private coolLen: number
  /** ברירת מחדל: ערך לכל פריים (40ms). לדיוק גבוה יותר: new OnsetDetector(8, 4, 6) עם בלוקים של 20ms */
  constructor(look = 6, tail = 3, coolLen = 5) {
    this.look = look
    this.tail = tail
    this.coolLen = coolLen
  }
  push(rms: number): boolean {
    const n = this.h.length
    let onset = false
    if (n >= this.look && this.cool === 0) {
      const prev = this.h.slice(n - this.look)
      const prevMax = Math.max(...prev)
      const iMax = prev.indexOf(prevMax)
      const after = prev.slice(iMax + 1)
      const prevMin = after.length ? Math.min(...after.slice(-this.tail)) : prevMax
      onset = after.length > 0 && prevMax > 0.004 && prevMin < 0.72 * prevMax && rms > 1.3 * prevMin && rms >= 0.75 * prevMax
      if (onset) this.cool = this.coolLen
    }
    if (this.cool > 0 && !onset) this.cool--
    this.h.push(rms)
    if (this.h.length > this.look + 2) this.h.shift()
    return onset
  }
  reset() { this.h = []; this.cool = 0 }
}

/** עוצמה (RMS) של הבלוקים האחרונים בחלון: רזולוציית זמן עדינה (20ms) לזיהוי ירידה קטנה בין צלילים */
export function blockRms(buf: Float32Array, blocks = 2, size = 960): number[] {
  const out: number[] = []
  for (let b = blocks - 1; b >= 0; b--) {
    const end = buf.length - b * size
    let s = 0
    for (let i = end - size; i < end; i++) s += buf[i] * buf[i]
    out.push(Math.sqrt(s / size))
  }
  return out
}

/** הצבעת רוב לגבי "הצליל המבוקש נשמע": 3 פריימים מתוך 6 עם מחזוריות של לפחות 75% */
export class TargetVote {
  private win: boolean[] = []
  private target: string | null = null
  push(target: string | null, conf: number): boolean {
    if (target !== this.target) { this.target = target; this.win = [] }
    this.win.push(conf >= 0.75)
    if (this.win.length > 6) this.win.shift()
    return target !== null && this.win.filter(Boolean).length >= 3
  }
  reset() { this.win = []; this.target = null }
}
