export interface Melody {
  id: string
  title: string
  notes: string[]
  /** מילים לקריוקי: שורה לכל פסוקית. רווח = גבול מילה, מקף = גבול הברה. הברה אחת לכל צליל. */
  lyrics?: string[]
  /** משך כל צליל בפעימות (ברירת מחדל 1). ארוך בסוף פסוקית, כמו בשיר */
  beats?: number[]
  bpm?: number
}

export const MELODIES: Melody[] = [
  {
    id: 'twinkle', title: 'כוכב קטן (השיר המלא)',
    notes: [
      'C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5', 'D5', 'C5',
      'G5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5', 'G5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5',
      'C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5', 'D5', 'C5',
    ],
    beats: Array.from({ length: 6 }, () => [1, 1, 1, 1, 1, 1, 2]).flat(),
    bpm: 100,
    lyrics: [
      'כו-כב ק-טן ב-לי-לה', 'מ-איר לי את ה-ד-רך',
      'ה-י-רח וה-כו-כב-ים', 'שרים לי שיר ש-קט ו-רך',
      'כו-כב ק-טן ב-לי-לה', 'מ-איר לי את ה-ד-רך',
    ],
  },
  {
    id: 'ode', title: 'שיר השמחה (בטהובן)',
    notes: ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5', 'C5', 'C5', 'D5', 'E5', 'E5', 'D5', 'D5'],
    beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2],
    bpm: 112,
    lyrics: ['שיר של שמ-חה', 'ב-לב כו-לנו', 'מ-נג-נים יחד', 'ב-שמ-חה'],
  },
  {
    id: 'mary', title: 'מרי והכבשה (Mary Had a Little Lamb)',
    notes: ['E5', 'D5', 'C5', 'D5', 'E5', 'E5', 'E5', 'D5', 'D5', 'D5', 'E5', 'G5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'E5', 'E5', 'E5', 'D5', 'D5', 'E5', 'D5', 'C5'],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4],
    bpm: 108,
  },
  {
    id: 'jingle', title: 'Jingle Bells (הפזמון)',
    notes: ['E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'G5', 'C5', 'D5', 'E5', 'F5', 'F5', 'F5', 'F5', 'F5', 'E5', 'E5', 'E5', 'E5', 'G5', 'G5', 'F5', 'D5', 'C5'],
    beats: [1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4, 1, 1, 1.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 4],
    bpm: 120,
  },
  {
    id: 'jacques', title: 'האח יעקב (Frère Jacques)',
    notes: ['C5', 'D5', 'E5', 'C5', 'C5', 'D5', 'E5', 'C5', 'E5', 'F5', 'G5', 'E5', 'F5', 'G5', 'G5', 'A5', 'G5', 'F5', 'E5', 'C5', 'G5', 'A5', 'G5', 'F5', 'E5', 'C5', 'C5', 'G4', 'C5', 'C5', 'G4', 'C5'],
    beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 1, 1, 2],
    bpm: 108,
  },
  {
    id: 'buns', title: 'Hot Cross Buns (השיר הראשון)',
    notes: ['E5', 'D5', 'C5', 'E5', 'D5', 'C5', 'C5', 'C5', 'C5', 'C5', 'D5', 'D5', 'D5', 'D5', 'E5', 'D5', 'C5'],
    beats: [1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 2],
    bpm: 100,
  },
  {
    id: 'lune', title: 'אור הירח (Au Clair de la Lune)',
    notes: ['C5', 'C5', 'C5', 'D5', 'E5', 'D5', 'C5', 'E5', 'D5', 'D5', 'C5'],
    beats: [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 4],
    bpm: 96,
  },
  {
    id: 'row', title: 'שוט שוט סירה (Row Row Row)',
    notes: ['C5', 'C5', 'C5', 'D5', 'E5', 'E5', 'D5', 'E5', 'F5', 'G5', 'C6', 'C6', 'C6', 'G5', 'G5', 'G5', 'E5', 'E5', 'E5', 'C5', 'C5', 'C5', 'G5', 'F5', 'E5', 'D5', 'C5'],
    beats: [1, 1, 0.75, 0.25, 1, 0.75, 0.25, 0.75, 0.25, 2, ...Array(12).fill(1 / 3), 0.75, 0.25, 0.75, 0.25, 2],
    bpm: 80,
  },
  {
    id: 'susanna', title: 'אוה סוזנה (Oh Susanna)',
    notes: ['C5', 'D5', 'E5', 'G5', 'G5', 'A5', 'G5', 'E5', 'C5', 'D5', 'E5', 'E5', 'D5', 'C5', 'D5'],
    beats: [0.5, 0.5, 1, 1, 0.75, 0.25, 1, 1, 0.75, 0.25, 1, 1, 1, 1, 2],
    bpm: 110,
  },
  {
    id: 'saints', title: 'כשהקדושים צועדים (When the Saints)',
    notes: ['C5', 'E5', 'F5', 'G5', 'C5', 'E5', 'F5', 'G5', 'C5', 'E5', 'F5', 'G5', 'E5', 'C5', 'E5', 'D5', 'E5', 'E5', 'D5', 'C5', 'C5', 'E5', 'G5', 'G5', 'F5', 'E5', 'F5', 'G5', 'E5', 'C5', 'D5', 'C5'],
    beats: [1, 1, 1, 4, 1, 1, 1, 4, 1, 1, 1, 2, 2, 2, 2, 4, 1, 1, 1, 3, 1, 2, 1, 1, 4, 1, 1, 2, 2, 2, 2, 4],
    bpm: 120,
  },
  {
    id: 'scale', title: 'סולם דו מז׳ור',
    notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'],
    beats: [1, 1, 1, 1, 1, 1, 1, 2],
    bpm: 96,
    lyrics: ['דו רה מי פה סול לה סי דו'],
  },
]

export interface KSyl { text: string; index: number; wordEnd: boolean }
/** מפרק מילים לשורות של הברות, כשכל הברה מקבלת את מספר הצליל שלה במנגינה */
export function parseLyrics(lyrics: string[]): KSyl[][] {
  let i = 0
  return lyrics.map((line) =>
    line.split(' ').flatMap((word) => {
      const syl = word.split('-')
      return syl.map((text, k) => ({ text, index: i++, wordEnd: k === syl.length - 1 }))
    }),
  )
}

/** חלוקה אוטומטית לשורות (בערך שני תיבות, עד 12 צלילים) כדי ששיר בלי מילים יוצג כשורות טאבים קריאות */
export function autoPhrases(notes: string[], beats?: number[]): number[] {
  const out: number[] = []
  let count = 0, sum = 0
  notes.forEach((_, i) => {
    count++
    sum += beats?.[i] ?? 1
    if (sum >= 8 || count >= 12) { out.push(count); count = 0; sum = 0 }
  })
  if (count > 0) out.push(count)
  return out
}
