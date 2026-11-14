import { noteToFreq } from '../harmonica/notes'

let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = ctx ?? new Ctx()
  void ctx.resume()
  return ctx
}

interface Voice { stop: () => void }
let active: Voice[] = []
let timers: number[] = []

/** צליל חם דמוי מפוחית: שני קנים מכוונים קצת שונה, מסנן, ויברטו עדין שנכנס באיחור ונשימה בתחילת הצליל */
function voice(ac: AudioContext, freq: number, t0: number, dur: number): Voice {
  const out = ac.createGain()
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = Math.min(3200, freq * 4.5)
  filter.Q.value = 0.8
  filter.connect(out)
  out.connect(ac.destination)

  const peak = 0.2
  out.gain.setValueAtTime(0, t0)
  out.gain.linearRampToValueAtTime(peak, t0 + 0.045)
  out.gain.setValueAtTime(peak * 0.9, t0 + Math.max(0.06, dur - 0.1))
  out.gain.linearRampToValueAtTime(0, t0 + dur)

  const lfo = ac.createOscillator()
  lfo.frequency.value = 5.2
  const lfoGain = ac.createGain()
  lfoGain.gain.setValueAtTime(0, t0)
  lfoGain.gain.linearRampToValueAtTime(7, t0 + Math.min(0.5, dur)) // סנטים
  lfo.connect(lfoGain)

  const oscs: OscillatorNode[] = [lfo]
  for (const [type, detune, g] of [['sawtooth', -6, 0.5], ['sawtooth', 6, 0.5], ['triangle', 0, 0.45]] as const) {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    lfoGain.connect(o.detune)
    const gn = ac.createGain()
    gn.gain.value = g
    o.connect(gn).connect(filter)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
    oscs.push(o)
  }
  lfo.start(t0)
  lfo.stop(t0 + dur + 0.05)

  // נשימה קצרה בתחילת הצליל
  const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate)
  const d = nbuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const ns = ac.createBufferSource()
  ns.buffer = nbuf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = Math.min(3500, freq * 3)
  bp.Q.value = 0.9
  const ng = ac.createGain()
  ng.gain.value = 0.09
  ns.connect(bp).connect(ng).connect(out)
  ns.start(t0)

  return {
    stop: () => {
      const n = ac.currentTime
      out.gain.cancelScheduledValues(n)
      out.gain.setValueAtTime(out.gain.value, n)
      out.gain.linearRampToValueAtTime(0, n + 0.04)
      oscs.forEach((o) => { try { o.stop(n + 0.05) } catch { /* already stopped */ } })
    },
  }
}

export function stopPlayback(): void {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
  active.forEach((v) => v.stop())
  active = []
}

/** מנגן צליל הדגמה ומחכה לסיומו (כדי לא להקשיב למיקרופון בזמן ההדגמה) */
export function playTone(note: string, seconds = 1.4): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ac = getCtx()
      active.push(voice(ac, noteToFreq(note), ac.currentTime + 0.02, seconds))
      timers.push(window.setTimeout(resolve, seconds * 1000 + 50))
    } catch {
      resolve()
    }
  })
}

export interface MelodyHandle { done: Promise<void>; stop: () => void }

/**
 * מנגן שיר בקצב: beats לכל צליל (ברירת מחדל 1), bpm מהירות.
 * כל הצלילים מתוזמנים מראש בשעון האודיו, ולכן הקצב מדויק ולא תלוי בדפדפן.
 */
export function playMelody(notes: string[], beats: number[] | undefined, bpm: number, onNote: (i: number) => void): MelodyHandle {
  stopPlayback()
  const ac = getCtx()
  const beatSec = 60 / bpm
  let t = ac.currentTime + 0.15
  const start = t
  notes.forEach((n, i) => {
    const dur = (beats?.[i] ?? 1) * beatSec
    // קצת רווח בסוף כל צליל, כדי שחזרות על אותו צליל יישמעו נפרדות
    active.push(voice(ac, noteToFreq(n), t, Math.max(0.1, dur * 0.92)))
    timers.push(window.setTimeout(() => onNote(i), Math.max(0, (t - ac.currentTime) * 1000)))
    t += dur
  })
  const total = (t - start + 0.2) * 1000
  const done = new Promise<void>((resolve) => { timers.push(window.setTimeout(resolve, total + 150)) })
  return { done, stop: stopPlayback }
}
