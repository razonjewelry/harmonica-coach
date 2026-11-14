export interface Melody {
  id: string
  title: string
  notes: string[]
  /** מילים לקריוקי: שורה לכל פסוקית. רווח = גבול מילה, מקף = גבול הברה. הברה אחת לכל צליל. */
  lyrics?: string[]
}

export const MELODIES: Melody[] = [
  {
    id: 'twinkle', title: 'כוכב קטן',
    notes: ['C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5', 'D5', 'C5'],
    lyrics: ['כו-כב ק-טן ב-לי-לה', 'מ-איר לי את ה-ד-רך'],
  },
  {
    id: 'ode', title: 'שיר השמחה (בטהובן)',
    notes: ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5', 'C5', 'C5', 'D5', 'E5', 'E5', 'D5', 'D5'],
    lyrics: ['שיר של שמ-חה', 'ב-לב כו-לנו', 'מ-נג-נים יחד', 'ב-שמ-חה'],
  },
  {
    id: 'scale', title: 'סולם דו מז׳ור',
    notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'],
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
