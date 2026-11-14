import { useCallback, useEffect, useRef, useState } from 'react'
import { blockRms, bandpass, detectPitchFiltered, StabilityTracker, OnsetDetector, TargetVote, targetPeriodicity } from '../harmonica/pitch'
import { noteToFreq } from '../harmonica/notes'
import type { NoteMatch, PitchResult } from '../harmonica/pitch'
import { matchNote } from '../harmonica/pitch'

export type MicStatus = 'idle' | 'starting' | 'on' | 'denied' | 'nodevice' | 'unsupported' | 'error'

export interface MicFrame {
  /** צליל יציב ומאושר, או null */
  stable: NoteMatch | null
  /** מה שנשמע עכשיו (לתצוגה בלבד, לא להצלחה) */
  raw: { note: string; cents: number } | null
  confidence: number
  rms: number
  /** תחילת צליל חדש לפי העוצמה */
  onset: boolean
  /** הצליל המבוקש אומת במחזוריות (לא תלוי בזיהוי הכללי) */
  targetHit: boolean
  /** יש צליל מחזורי ברגע זה (בלי זיכרון) */
  sounding: boolean
}

export const MIC_MESSAGES: Record<MicStatus, string> = {
  idle: 'המיקרופון כבוי',
  starting: 'מפעיל מיקרופון...',
  on: 'המיקרופון פעיל',
  denied: 'אין הרשאה למיקרופון. אפשר להפעיל אותה בהגדרות האתר בדפדפן ולטעון מחדש.',
  nodevice: 'לא נמצא מיקרופון במכשיר.',
  unsupported: 'הדפדפן או החיבור לא תומכים במיקרופון. הפתח את האפליקציה בכתובת https ב-Chrome.',
  error: 'שגיאה בהפעלת המיקרופון. נסה לטעון מחדש.',
}

export function useMic(onFrame: (f: MicFrame) => void, paused: boolean, getTarget?: () => string | null) {
  const [status, setStatus] = useState<MicStatus>('idle')
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const frameRef = useRef(onFrame)
  const pausedRef = useRef(paused)
  const trackerRef = useRef(new StabilityTracker())
  const onsetRef = useRef(new OnsetDetector(8, 4, 6))
  const voteRef = useRef(new TargetVote())
  const targetFnRef = useRef(getTarget)
  targetFnRef.current = getTarget
  frameRef.current = onFrame
  pausedRef.current = paused

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (ctxRef.current) return
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setStatus('unsupported'); return }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      })
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      if (ctx.state === 'suspended') await ctx.resume()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 4096
      src.connect(an)
      streamRef.current = stream
      ctxRef.current = ctx
      const buf = new Float32Array(an.fftSize)
      trackerRef.current.reset()
      onsetRef.current.reset()
      voteRef.current.reset()
      timerRef.current = window.setInterval(() => {
        if (pausedRef.current) { trackerRef.current.reset(); onsetRef.current.reset(); voteRef.current.reset(); return }
        an.getFloatTimeDomainData(buf)
        const filtered = bandpass(buf, ctx.sampleRate)
        const r: PitchResult = detectPitchFiltered(filtered, ctx.sampleRate)
        const tgt = targetFnRef.current?.() ?? null
        const targetHit = tgt ? voteRef.current.push(tgt, targetPeriodicity(filtered, ctx.sampleRate, noteToFreq(tgt))) : voteRef.current.push(null, 0)
        const stable = trackerRef.current.push(r)
        const raw = r.freq !== null && r.confidence >= 0.6 ? matchNote(r.freq) : null
        frameRef.current({ stable, raw, confidence: r.confidence, rms: r.rms, onset: blockRms(filtered).map((v) => onsetRef.current.push(v)).some(Boolean), targetHit, sounding: r.freq !== null && r.confidence >= 0.5 })
      }, 40)
      setStatus('on')
    } catch (e) {
      const name = (e as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied')
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('nodevice')
      else setStatus('error')
    }
  }, [])

  useEffect(() => stop, [stop])

  return { status, start, stop }
}
