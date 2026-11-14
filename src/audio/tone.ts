import { noteToFreq } from '../harmonica/notes'

let ctx: AudioContext | null = null

/** מנגן צליל הדגמה ומחכה לסיומו (כדי לא להקשיב למיקרופון בזמן ההדגמה) */
export function playTone(note: string, seconds = 1.4): Promise<void> {
  return new Promise((resolve) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = ctx ?? new Ctx()
      void ctx.resume()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = noteToFreq(note)
      const t = ctx.currentTime
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.35, t + 0.05)
      g.gain.setValueAtTime(0.35, t + seconds - 0.2)
      g.gain.linearRampToValueAtTime(0, t + seconds)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + seconds)
      o.onended = () => resolve()
    } catch {
      resolve()
    }
  })
}
