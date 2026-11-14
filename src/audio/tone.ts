import { noteToFreq } from '../harmonica/notes'

let ctx: AudioContext | null = null
let bus: { input: GainNode } | null = null

export function getCtx(): AudioContext {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = ctx ?? new Ctx()
  void ctx.resume()
  return ctx
}

/** מסלול שמע משותף: הד קל של חדר + דחיסה עדינה, כדי שהצליל יישמע טבעי ולא יבש */
export function getBus(ac: AudioContext): GainNode {
  if (bus) return bus.input
  const input = ac.createGain()
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 3
  input.connect(comp)
  comp.connect(ac.destination)

  const len = Math.floor(ac.sampleRate * 0.9)
  const ir = ac.createBuffer(2, len, ac.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
  }
  const conv = ac.createConvolver()
  conv.buffer = ir
  const wet = ac.createGain()
  wet.gain.value = 0.28
  input.connect(conv)
  conv.connect(wet)
  wet.connect(comp)
  bus = { input }
  return input
}

interface Voice { stop: () => void; end: number }
let active: Voice[] = []
let timers: number[] = []
let sched: number | null = null
let noiseBuf: AudioBuffer | null = null

function getNoise(ac: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf
  const len = ac.sampleRate * 2
  noiseBuf = ac.createBuffer(1, len, ac.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return noiseBuf
}

/**
 * צליל דמוי מפוחית: שני קנים מכוונים קצת שונה (מנצנץ), מסנן רך, נשימה קבועה בשקט,
 * ויברטו שנכנס באיחור, והתפחות קלה בצליל ארוך. כל צליל מקבל סטייה זעירה כדי לא להישמע מכני.
 */
function voice(ac: AudioContext, freq: number, t0: number, dur: number): Voice {
  const out = ac.createGain()
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(Math.min(1800, freq * 2.2), t0)
  filter.frequency.linearRampToValueAtTime(Math.min(2800, freq * 3.6), t0 + 0.12) // נפתח בתחילת הצליל
  filter.Q.value = 0.6
  filter.connect(out)
  out.connect(getBus(ac))

  const peak = 0.17
  const attack = 0.06
  out.gain.setValueAtTime(0, t0)
  out.gain.linearRampToValueAtTime(peak, t0 + attack)
  if (dur > 0.9) out.gain.linearRampToValueAtTime(peak * 1.12, t0 + dur * 0.55) // התפחות בצליל ארוך
  out.gain.setValueAtTime(peak * 0.95, t0 + Math.max(attack + 0.02, dur - 0.14))
  out.gain.linearRampToValueAtTime(0, t0 + dur)

  const drift = (Math.random() - 0.5) * 6 // סנטים
  const lfo = ac.createOscillator()
  lfo.frequency.value = 4.8 + Math.random() * 0.8
  const lfoGain = ac.createGain()
  lfoGain.gain.setValueAtTime(0, t0)
  lfoGain.gain.setValueAtTime(0, t0 + 0.25)
  lfoGain.gain.linearRampToValueAtTime(6, t0 + Math.min(0.9, Math.max(0.3, dur)))
  lfo.connect(lfoGain)

  const oscs: OscillatorNode[] = [lfo]
  const parts: [OscillatorType, number, number][] = [['sawtooth', -7, 0.32], ['sawtooth', 7, 0.32], ['triangle', 0, 0.55], ['square', 3, 0.06]]
  for (const [type, detune, g] of parts) {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune + drift
    lfoGain.connect(o.detune)
    const gn = ac.createGain()
    gn.gain.value = g
    o.connect(gn).connect(filter)
    o.start(t0)
    o.stop(t0 + dur + 0.08)
    oscs.push(o)
  }
  lfo.start(t0)
  lfo.stop(t0 + dur + 0.08)

  // נשימה: פרץ קצר בתחילת הצליל ורקע שקט לאורכו
  const ns = ac.createBufferSource()
  ns.buffer = getNoise(ac)
  ns.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = Math.min(4000, freq * 3.2)
  bp.Q.value = 0.8
  const ng = ac.createGain()
  ng.gain.setValueAtTime(0.11, t0)
  ng.gain.exponentialRampToValueAtTime(0.012, t0 + 0.14)
  ng.gain.setValueAtTime(0.012, t0 + Math.max(0.15, dur - 0.1))
  ng.gain.linearRampToValueAtTime(0, t0 + dur)
  ns.connect(bp).connect(ng).connect(out)
  ns.start(t0, Math.random() * 1.5)
  ns.stop(t0 + dur + 0.05)

  return {
    end: t0 + dur + 0.1,
    stop: () => {
      const n = ac.currentTime
      out.gain.cancelScheduledValues(n)
      out.gain.setValueAtTime(out.gain.value, n)
      out.gain.linearRampToValueAtTime(0, n + 0.05)
      oscs.forEach((o) => { try { o.stop(n + 0.06) } catch { /* already stopped */ } })
      try { ns.stop(n + 0.06) } catch { /* already stopped */ }
    },
  }
}

export function stopPlayback(): void {
  if (sched !== null) window.clearInterval(sched)
  sched = null
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
  const starts: number[] = []
  let acc = 0
  notes.forEach((_, i) => { starts.push(acc); acc += (beats?.[i] ?? 1) * beatSec })
  const total = acc
  const t0 = ac.currentTime + 0.15
  let next = 0
  let finish: () => void = () => {}
  const done = new Promise<void>((resolve) => { finish = resolve })

  // תזמון מתגלגל: מתזמנים רק את מה שבשנייה וחצי הקרובות, כדי ששירים ארוכים לא יכבידו על הטלפון
  const tick = () => {
    const now = ac.currentTime
    active = active.filter((v) => v.end > now)
    while (next < notes.length && t0 + starts[next] < now + 1.5) {
      const i = next++
      const t = t0 + starts[i]
      const dur = (beats?.[i] ?? 1) * beatSec
      // קצת רווח בסוף כל צליל, כדי שחזרות על אותו צליל יישמעו נפרדות
      active.push(voice(ac, noteToFreq(notes[i]), t, Math.max(0.12, dur * 0.93)))
      timers.push(window.setTimeout(() => onNote(i), Math.max(0, (t - now) * 1000)))
    }
    if (next >= notes.length && sched !== null) {
      window.clearInterval(sched)
      sched = null
      timers.push(window.setTimeout(finish, Math.max(0, (t0 + total - ac.currentTime) * 1000) + 350))
    }
  }
  tick()
  if (next < notes.length) sched = window.setInterval(tick, 200)
  else timers.push(window.setTimeout(finish, Math.max(0, (t0 + total - ac.currentTime) * 1000) + 350))
  return { done, stop: stopPlayback }
}
