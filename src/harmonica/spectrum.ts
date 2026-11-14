/** FFT איטרטיבי (רדיקס 2). מחזיר מגניטודות של חצי הספקטרום. אורך חייב להיות חזקת 2. */
export function magnitudeSpectrum(input: Float32Array): Float32Array {
  const n = input.length
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let i = 0; i < n; i++) re[i] = input[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))) // חלון האן
  // היפוך ביטים
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
  const out = new Float32Array(n / 2)
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i])
  return out
}

/**
 * האם הצליל המבוקש נשמע, לפי הספקטרום? בודק:
 * 1) יש שיא ברור בתדר המבוקש (גם כשההרמוניה השנייה חזקה יותר, כמו בצלילי שאיפה בהירים)
 * 2) אין אנרגיה משמעותית בחצי התדר (אז זה צליל נמוך יותר שההרמוניה שלו נפלה על המבוקש)
 * 3) כל שיא חזק אחר הוא הרמוניה של המבוקש (אקורד, רעש וצליל אחר נפסלים)
 */
export function targetSpectral(buf: Float32Array, sampleRate: number, targetFreq: number): boolean {
  const spec = magnitudeSpectrum(buf)
  const hz = sampleRate / buf.length
  const bin = (f: number) => Math.round(f / hz)
  const peakNear = (f: number, tol = 0.03): number => {
    let m = 0
    for (let i = Math.max(1, bin(f * (1 - tol))); i <= Math.min(spec.length - 1, bin(f * (1 + tol))); i++) m = Math.max(m, spec[i])
    return m
  }
  const lo = bin(180), hi = Math.min(spec.length - 1, bin(3400))
  const band = Array.from(spec.slice(lo, hi)).sort((a, b) => a - b)
  const noise = band[Math.floor(band.length / 2)] || 1e-9
  const e1 = peakNear(targetFreq)
  if (e1 < 10 * noise) return false
  if (peakNear(targetFreq / 2, 0.04) > 0.35 * e1) return false
  // כל שיא חזק אחר חייב להיות הרמוניה של התדר המבוקש
  const strong = 0.3 * e1
  for (let i = lo + 1; i < hi - 1; i++) {
    if (spec[i] < strong || spec[i] < spec[i - 1] || spec[i] < spec[i + 1]) continue
    const f = i * hz
    const k = Math.round(f / targetFreq)
    if (k < 1 || Math.abs(f - k * targetFreq) / (k * targetFreq) > 0.045) return false
  }
  return true
}
