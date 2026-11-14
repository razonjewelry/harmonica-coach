import { describe, it, expect } from 'vitest'
import { SequenceMatcher } from './sequence'
import { LESSONS } from './data'
import { MELODIES, parseLyrics } from './melodies'
import { emptyProgress, markCompleted, markStep, loadProgress, saveProgress } from './progress'
import { findHole } from '../harmonica/notes'

const m = (note: string) => ({ note, cents: 0 })

describe('SequenceMatcher', () => {
  it('מתקדם על צלילים נכונים עם הפסקה', () => {
    const s = new SequenceMatcher(['C5', 'D5'])
    expect(s.push(m('C5')).advanced).toBe(true)
    // אותו צליל ממשיך: לא נספר שוב
    expect(s.push(m('C5')).advanced).toBe(false)
    for (let i = 0; i < 3; i++) s.push(null)
    expect(s.push(m('D5')).done).toBe(true)
  })
  it('אותו צליל פעמיים דורש הפסקה', () => {
    const s = new SequenceMatcher(['C5', 'C5'])
    s.push(m('C5'))
    expect(s.push(m('C5')).advanced).toBe(false)
    expect(s.index).toBe(1)
  })
  it('צליל שגוי לא מקדם ומדווח', () => {
    const s = new SequenceMatcher(['C5'])
    const e = s.push(m('E5'))
    expect(e.advanced).toBe(false)
    expect(e.wrong).toBe('E5')
    expect(s.done).toBe(false)
  })
  it('שקט לא מקדם', () => {
    const s = new SequenceMatcher(['C5'])
    for (let i = 0; i < 10; i++) s.push(null)
    expect(s.index).toBe(0)
  })
})

describe('נתוני שיעורים', () => {
  it('לכל שיעור יש הסבר, הדגמה/תרגול, בדיקה וסיכום', () => {
    for (const l of LESSONS) {
      const kinds = l.steps.map((s) => s.kind)
      expect(['explain', 'demo', 'check', 'echo']).toContain(kinds[0])
      expect(kinds[kinds.length - 1]).toBe('summary')
      expect(kinds.some((k) => k === 'check' || k === 'hold' || k === 'echo')).toBe(true)
    }
  })
  it('24 שיעורים עם מזהים ומספרים ייחודיים', () => {
    expect(LESSONS.length).toBe(24)
    expect(LESSONS.map((l) => l.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })
  it('כל התווים בשיעורים ובמנגינות קיימים במפוחית C', () => {
    const notes: string[] = []
    for (const l of LESSONS) for (const s of l.steps) {
      if (s.kind === 'demo' || s.kind === 'practice' || s.kind === 'hold') notes.push(s.note)
      if (s.kind === 'check' || s.kind === 'echo') notes.push(...s.notes)
    }
    for (const mel of MELODIES) notes.push(...mel.notes)
    for (const n of notes) expect(findHole(n).length, n).toBeGreaterThan(0)
  })
})

describe('נגינה חוזרת ומעבר בין צלילים', () => {
  it('מעבר ישיר לצליל אחר (בלי שקט) מתקדם', () => {
    const s = new SequenceMatcher(['G5', 'F5'])
    s.push(m('G5'))
    expect(s.push(m('F5')).advanced).toBe(true)
  })
  it('אותו צליל פעמיים עם תחילת צליל חדש (בלי שקט) מתקדם', () => {
    const s = new SequenceMatcher(['G5', 'G5'])
    s.push(m('G5'))
    expect(s.push(m('G5'), false).advanced).toBe(false)
    expect(s.push(m('G5'), true).advanced).toBe(true)
  })
  it('דילוג ידני', () => {
    const s = new SequenceMatcher(['G5', 'F5'])
    s.skip()
    expect(s.target).toBe('F5')
  })
})

describe('קריוקי: מילים מול צלילים', () => {
  it('מספר ההברות שווה למספר הצלילים בכל מנגינה', () => {
    for (const mel of MELODIES) {
      if (!mel.lyrics) continue
      const total = parseLyrics(mel.lyrics).flat().length
      expect(total, mel.title).toBe(mel.notes.length)
    }
  })
  it('המילים ממוספרות ברצף', () => {
    const flat = parseLyrics(['א-ב ג', 'ד']).flat()
    expect(flat.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(flat.map((s) => s.wordEnd)).toEqual([false, true, true, true])
  })
})

describe('שמירת התקדמות', () => {
  it('שמירה וטעינה, המשך מהמקום האחרון וחזרה על שיעור', () => {
    const mem: Record<string, string> = {}
    const store = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } }
    let p = markStep(emptyProgress(), 'l2', 3)
    saveProgress(p, store)
    expect(loadProgress(store).last).toEqual({ lessonId: 'l2', step: 3 })
    p = markCompleted(p, 'l2')
    p = markCompleted(p, 'l2')
    expect(p.completed['l2'].runs).toBe(2)
    expect(p.last).toBeNull()
  })
  it('נתונים פגומים לא שוברים', () => {
    expect(loadProgress({ getItem: () => '{bad' }).completed).toEqual({})
  })
})

describe('קצב השירים', () => {
  it('מספר הפעימות שווה למספר הצלילים', () => {
    for (const mel of MELODIES) if (mel.beats) expect(mel.beats.length, mel.title).toBe(mel.notes.length)
  })
})

describe('זנב הצליל', () => {
  it('אחרי שהצליל נגמר, זיכרון היציבות לא מקדם לצליל החוזר הבא', () => {
    const s = new SequenceMatcher(['G5', 'G5'])
    s.push(m('G5'), false, true)
    // הצליל נפסק אבל מנגנון היציבות עדיין מחזיר G5 כמה פריימים
    for (let i = 0; i < 4; i++) expect(s.push(m('G5'), false, false).advanced).toBe(false)
    expect(s.index).toBe(1)
    // רק צליל חי חדש מקדם
    expect(s.push(m('G5'), false, true).advanced).toBe(true)
  })
})

describe('לימוד קצב מהקשות', () => {
  it('הקשות במרווחים של 500ms ו-1000ms הופכות לפעימה אחת ושתיים', async () => {
    const { tapsToBeats } = await import('../components/RhythmTapper')
    const r = tapsToBeats([0, 500, 1000, 2000, 2500, 3000], 5)
    expect(r.beats).toEqual([1, 1, 2, 1, 1])
    expect(r.bpm).toBe(120)
  })
  it('אם הפסקת באמצע, שאר הצלילים מקבלים פעימה אחת', async () => {
    const { tapsToBeats } = await import('../components/RhythmTapper')
    expect(tapsToBeats([0, 600, 1200], 5).beats).toEqual([1, 1, 1, 1, 1])
  })
})


describe('כוכבים ורצף ימים', () => {
  it('כוכבים לפי דילוגים, ונשמר הטוב ביותר', async () => {
    const { starsFor } = await import('./progress')
    expect([starsFor(0), starsFor(1), starsFor(3)]).toEqual([3, 2, 1])
    let p = markCompleted(emptyProgress(), 'l1', new Date(2026, 10, 14), 1)
    p = markCompleted(p, 'l1', new Date(2026, 10, 14), 3)
    p = markCompleted(p, 'l1', new Date(2026, 10, 14), 2)
    expect(p.completed['l1'].stars).toBe(3)
  })
  it('רצף: היום +1 אחרי אתמול, מתאפס אחרי הפסקה', () => {
    let p = markCompleted(emptyProgress(), 'l1', new Date(2026, 10, 13))
    p = markCompleted(p, 'l2', new Date(2026, 10, 14))
    expect(p.streak?.count).toBe(2)
    p = markCompleted(p, 'l3', new Date(2026, 10, 14))
    expect(p.streak?.count).toBe(2)
    p = markCompleted(p, 'l4', new Date(2026, 10, 17))
    expect(p.streak?.count).toBe(1)
  })
})
