import { describe, it, expect } from 'vitest'
import { isTabLine, parsePageLines, parsePageText, unpackJson, songLink, bookmarklet } from './share'

describe('ייבוא מדף טאבים', () => {
  it('מזהה שורת טאבים: מינוס לפני או אחרי המספר', () => {
    expect(isTabLine('-4 5 -5 6')).toBe(true)
    expect(isTabLine('4- 5 5- 6')).toBe(true)
    expect(isTabLine('היא בלי')).toBe(false)
    expect(isTabLine('7')).toBe(false)
    expect(isTabLine('1 2 שלום')).toBe(false)
  })
  it('ממיר שורות: מינוס = שאיפה, בלי = נשיפה, ומחבר מילים', () => {
    const r = parsePageLines('שיר | אתר', ['-4 5 -5', 'ל-ה ל-ה ל-ה', '6 -6', '', 'טקסט', '4 4'])
    if ('error' in r) throw new Error(r.error)
    expect(r.title).toBe('שיר')
    expect(r.notes).toEqual(['D5', 'E5', 'F5', 'G5', 'A5', 'C5', 'C5'])
    expect(r.phrases).toEqual([3, 2, 2])
    expect(r.lyrics).toEqual(['לה לה לה', '', ''])
  })
  it('מדווח על חור שלא קיים ועל דף בלי טאבים', () => {
    expect(parsePageLines('x', ['12 5'])).toHaveProperty('error')
    expect(parsePageLines('x', ['שלום עולם'])).toHaveProperty('error')
  })
})

describe('שיתוף בקישור', () => {
  it('שיר עובר קידוד ופענוח בלי אובדן (כולל עברית)', async () => {
    const song = { id: 'c1', title: 'שיר בדיקה', notes: ['C5', 'D5', 'E5'], beats: [1, 2, 1], lyrics: ['שורה ראשונה'], phrases: [3] }
    const link = await songLink('https://x.test/app/', song)
    expect(link.startsWith('https://x.test/app/#song=')).toBe(true)
    const back = await unpackJson<typeof song>(link.split('#song=')[1])
    expect(back).toEqual(song)
  })
  it('הקישור קצר מספיק לשיר ארוך (400 צלילים)', async () => {
    const notes = Array.from({ length: 400 }, (_, i) => ['G5', 'A5', 'E5', 'C5'][i % 4])
    const link = await songLink('https://x.test/', { id: 'c', title: 't', notes, beats: notes.map(() => 1), lyrics: [], phrases: undefined })
    expect(link.length).toBeLessThan(4000)
  })
  it('הסימנייה היא javascript: תקין שאפשר לפענח', () => {
    const b = bookmarklet('https://x.test/')
    expect(b.startsWith('javascript:')).toBe(true)
    expect(() => new Function(decodeURIComponent(b.slice('javascript:'.length)))).not.toThrow()
  })
})

describe('הדבקת דף שלם שהועתק', () => {
  it('מוצא טאבים ומילים בתוך טקסט של דף שלם עם תפריטים', () => {
    const text = 'תפריט\nשיר דמו\n\n-4 5 -5 6\nלה לה לה לה\nפרסומת\n6 -6 7\nלי-לי לי\nתגובות'
    const r = parsePageText('', text)
    if ('error' in r) throw new Error(r.error)
    expect(r.notes.length).toBe(7)
    expect(r.lyrics).toEqual(['לה לה לה לה', 'לילי לי'])
    expect(r.title).toBe('תפריט')
  })
  it('טקסט בלי טאבים מחזיר הסבר', () => {
    expect(parsePageText('', 'סתם טקסט')).toHaveProperty('error')
  })
})
