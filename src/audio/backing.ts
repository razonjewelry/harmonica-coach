import { getCtx, getBus } from './tone'
import { noteToMidi, midiToFreq } from '../harmonica/notes'

/** אקורדים שמתאימים למפוחית C */
export const CHORDS: Record<string, string[]> = {
  C: ['C3', 'E3', 'G3'],
  F: ['F3', 'A3', 'C4'],
  G: ['G3', 'B3', 'D4'],
  G7: ['G3', 'B3', 'F4'],
  Am: ['A3', 'C4', 'E4'],
  Dm: ['D3', 'F3', 'A3'],
}
const ROOT: Record<string, string> = { C: 'C2', F: 'F2', G: 'G2', G7: 'G2', Am: 'A2', Dm: 'D2' }

export interface JamStyle { id: string; title: string; bpm: number; bars: string[]; feel: 'straight' | 'shuffle' }

export const STYLES: JamStyle[] = [
  { id: 'folk', title: 'פולק רגוע', bpm: 84, bars: ['C', 'F', 'C', 'G'], feel: 'straight' },
  { id: 'pop', title: 'פופ', bpm: 96, bars: ['C', 'G', 'Am', 'F'], feel: 'straight' },
  { id: 'blues', title: 'בלוז (12 תיבות)', bpm: 80, bars: ['C', 'C', 'C', 'C', 'F', 'F', 'C', 'C', 'G7', 'F', 'C', 'G7'], feel: 'shuffle' },
]

const f = (n: string) => midiToFreq(noteToMidi(n))

/** כלי ליווי עדינים: בס, אקורד מפורט (כמו גיטרה), ומקצב קל */
function pluck(ac: AudioContext, out: AudioNode, freq: number, t: number, dur: number, gain: number, type: OscillatorType = 'triangle') {
  const o = ac.createOscillator()
  const g = ac.createGain()
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(2400, t)
  lp.frequency.exponentialRampToValueAtTime(600, t + dur)
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
  o.connect(lp).connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

let noise: AudioBuffer | null = null
function hat(ac: AudioContext, out: AudioNode, t: number, gain: number) {
  if (!noise || noise.sampleRate !== ac.sampleRate) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const s = ac.createBufferSource()
  s.buffer = noise
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 6000
  const g = ac.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.06)
  s.connect(hp).connect(g).connect(out)
  s.start(t)
  s.stop(t + 0.08)
}
function kick(ac: AudioContext, out: AudioNode, t: number) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.frequency.setValueAtTime(110, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  g.gain.setValueAtTime(0.35, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.2)
}

/** מתזמן תיבה אחת (4 פעמות) של ליווי */
function scheduleBar(ac: AudioContext, out: AudioNode, chord: string, t0: number, beat: number, feel: 'straight' | 'shuffle', drums: boolean) {
  const notes = CHORDS[chord] ?? CHORDS.C
  const root = f(ROOT[chord] ?? 'C2')
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * beat
    pluck(ac, out, b % 2 === 0 ? root : root * 1.5, t, beat * 0.9, 0.22, 'sine')
    const off = feel === 'shuffle' ? beat * 0.66 : beat * 0.5
    notes.forEach((n, k) => pluck(ac, out, f(n), t + k * 0.012, beat * 0.8, 0.06))
    notes.forEach((n, k) => pluck(ac, out, f(n), t + off + k * 0.012, beat * 0.4, 0.035))
    if (drums) {
      if (b === 0 || b === 2) kick(ac, out, t)
      hat(ac, out, t, 0.05)
      hat(ac, out, t + off, 0.03)
    }
  }
}

export interface Backing { stop: () => void; startAt: number }

/**
 * ליווי מתגלגל: אקורדים לפי רשימת תיבות. loop=true חוזר בלי סוף (חדר ג'אם),
 * אחרת מנגן פעם אחת (מתחת להדגמה של שיר).
 */
export function startBacking(bars: string[], bpm: number, opts: { loop?: boolean; feel?: 'straight' | 'shuffle'; drums?: boolean; startAt?: number; volume?: number } = {}): Backing {
  const ac = getCtx()
  const out = ac.createGain()
  out.gain.value = opts.volume ?? 0.8
  out.connect(getBus(ac))
  const beat = 60 / bpm
  const barLen = beat * 4
  const start = opts.startAt ?? ac.currentTime + 0.15
  let i = 0
  let stopped = false
  const tick = () => {
    if (stopped) return
    while (start + i * barLen < ac.currentTime + 1.2) {
      if (!opts.loop && i >= bars.length) { window.clearInterval(iv); return }
      scheduleBar(ac, out, bars[i % bars.length], start + i * barLen, beat, opts.feel ?? 'straight', opts.drums ?? true)
      i++
    }
  }
  const iv = window.setInterval(tick, 250)
  tick()
  return {
    startAt: start,
    stop: () => {
      stopped = true
      window.clearInterval(iv)
      const n = ac.currentTime
      out.gain.cancelScheduledValues(n)
      out.gain.setValueAtTime(out.gain.value, n)
      out.gain.linearRampToValueAtTime(0, n + 0.15)
      window.setTimeout(() => out.disconnect(), 400)
    },
  }
}

/** בוחר אקורד לכל תיבה (4 פעמות) לפי הצלילים של המנגינה באותה תיבה */
export function autoChords(notes: string[], beats?: number[]): string[] {
  const pc = (n: string) => n.replace(/\d/, '')
  const cand: Record<string, string[]> = { C: ['C', 'E', 'G'], F: ['F', 'A', 'C'], G7: ['G', 'B', 'D', 'F'], Am: ['A', 'C', 'E'] }
  const bars: string[] = []
  let acc = 0
  let cur: { n: string; d: number }[] = []
  const flush = () => {
    if (!cur.length) { bars.push(bars[bars.length - 1] ?? 'C'); return }
    let best = 'C', bestScore = -1
    for (const [name, tones] of Object.entries(cand)) {
      const score = cur.reduce((s, x) => s + (tones.includes(pc(x.n)) ? x.d : 0), 0) + (name === 'C' ? 0.01 : 0)
      if (score > bestScore) { bestScore = score; best = name }
    }
    bars.push(best)
    cur = []
  }
  notes.forEach((n, i) => {
    const d = beats?.[i] ?? 1
    cur.push({ n, d })
    acc += d
    while (acc >= 4) { flush(); acc -= 4 }
  })
  if (acc > 0) flush()
  if (bars.length) bars[bars.length - 1] = 'C' // סיום בבית
  return bars
}
