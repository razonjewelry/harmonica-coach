import { it, expect } from 'vitest'
import { LAYOUT, noteToFreq } from './notes'
import { detectPitch, StabilityTracker, matchNote } from './pitch'

// בדיקת רגרסיה לכיול: צליל בסגנון קנה עם הרמוניות ורעש נשימה, זרם רציף, חלון 4096 כל 50ms
function stream(f: number, sr: number, amp: number, noise: number, seconds = 1.5) {
  const n = Math.floor(seconds * sr)
  const out = new Float32Array(n)
  const hs = [1, 0.7, 0.5, 0.4, 0.25, 0.15]
  let ph = 0
  for (let i = 0; i < n; i++) {
    let v = 0
    ph += (2 * Math.PI * f * (1 + 0.004 * Math.sin((2 * Math.PI * 5 * i) / sr))) / sr
    hs.forEach((a, k) => { v += a * Math.sin(ph * (k + 1)) })
    out[i] = amp * v / 2 + noise * (Math.random() * 2 - 1) * amp
  }
  return out
}

it('כל 20 הצלילים מזוהים בעוצמות נמוכות וברעש נשימה, בלי טעויות', () => {
  const rows: string[] = []
  for (const sr of [48000]) for (const [amp, noise] of [[0.3, 0.1], [0.03, 0.2], [0.03, 0.5], [0.01, 0.2], [0.01, 0.5]]) {
    let okNotes = 0, total = 0, wrong = 0
    const rms: string[] = []
    const bad: string[] = []
    for (const h of Object.values(LAYOUT)) for (const note of [h.blow, h.draw]) {
      total++
      const s = stream(noteToFreq(note), sr, amp, noise)
      const tr = new StabilityTracker()
      let first = -1, wr = false
      for (let k = 0; ; k++) {
        const st = k * Math.floor(sr * 0.05)
        if (st + 4096 > s.length) break
        const r = detectPitch(s.subarray(st, st + 4096), sr)
        if (k === 12) rms.push(r.rms.toFixed(4))
        const m = tr.push(r)
        if (m && first < 0) { first = k; if (m.note !== note) wr = true }
        else if (m && m.note !== note) wr = true
      }
      if (first >= 0 && !wr) okNotes++
      else bad.push(`${note}${first < 0 ? '(miss)' : '(wrong:' + matchNote(noteToFreq(note)).note + ')'}`)
      if (wr) wrong++
    }
    expect(okNotes, `amp=${amp} noise=${noise}`).toBe(total)
    expect(wrong).toBe(0)
    rows.push(`sr=${sr} amp=${amp} noise=${noise}: ok ${okNotes}/${total}, wrong ${wrong}; rms~${rms[0]}; bad: ${bad.join(' ')}`)
  }
  console.log('\n' + rows.join('\n'))
}, 120000)
