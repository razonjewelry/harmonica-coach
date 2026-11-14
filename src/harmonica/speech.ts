// מורה קולי בעברית באמצעות SpeechSynthesis. הכול מקומי, בלי שרת.
const KEY = 'hc.voice.enabled'

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getHebrewVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'he-il') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('he')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('iw')) ??
    null
  )
}

export function voiceEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== '0' } catch { return true }
}
export function setVoiceEnabled(on: boolean): void {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  if (!on) stopSpeaking()
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** מקריא טקסט ומחכה לסיום. אם ההדרכה כבויה או אין קול עברי, חוזר מיד. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!speechSupported() || !voiceEnabled()) return resolve()
    const voice = getHebrewVoice()
    if (!voice) return resolve() // לא מקריאים בקול זר: עדיף שקט מעברית שגויה
    stopSpeaking()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = 0.95
    const guard = window.setTimeout(resolve, Math.max(4000, text.length * 140))
    const done = () => { window.clearTimeout(guard); resolve() }
    u.onend = done
    u.onerror = done
    window.speechSynthesis.speak(u)
  })
}

/** קולות נטענים אסינכרונית בחלק מהדפדפנים */
export function onVoicesReady(cb: () => void): () => void {
  if (!speechSupported()) return () => {}
  const h = () => cb()
  window.speechSynthesis.addEventListener('voiceschanged', h)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', h)
}
