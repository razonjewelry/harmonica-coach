import { useCallback, useEffect, useRef, useState } from 'react'

/** הודעה זמנית: נעלמת מעצמה אחרי רגע, כדי שלא תישאר "נכון!" כשאין צליל */
export function useFlash(): [string, (text: string, ms?: number) => void, () => void] {
  const [msg, setMsg] = useState('')
  const timer = useRef<number | null>(null)
  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setMsg('')
  }, [])
  const flash = useCallback((text: string, ms = 1000) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    setMsg(text)
    timer.current = window.setTimeout(() => { timer.current = null; setMsg('') }, ms)
  }, [])
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current) }, [])
  return [msg, flash, clear]
}
