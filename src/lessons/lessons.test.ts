import { describe, it, expect } from 'vitest'
import { SequenceMatcher } from './sequence'
import { LESSONS } from './data'
import { MELODIES } from './melodies'
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
      expect(kinds[0]).toBe('explain')
      expect(kinds[kinds.length - 1]).toBe('summary')
      expect(kinds).toContain('check')
    }
  })
  it('ארבעה שיעורים לפחות עם מזהים ייחודיים', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(4)
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })
  it('כל התווים בשיעורים ובמנגינות קיימים במפוחית C', () => {
    const notes: string[] = []
    for (const l of LESSONS) for (const s of l.steps) {
      if (s.kind === 'demo' || s.kind === 'practice') notes.push(s.note)
      if (s.kind === 'check') notes.push(...s.notes)
    }
    for (const mel of MELODIES) notes.push(...mel.notes)
    for (const n of notes) expect(findHole(n).length, n).toBeGreaterThan(0)
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
