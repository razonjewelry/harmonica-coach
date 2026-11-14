import { COURSE } from './course'

// שיעורים מבוססי נתונים. כל שיעור: הסבר, הדגמה, תרגול, בדיקה וסיכום.
export type Step =
  | { kind: 'explain'; title: string; say: string }
  | { kind: 'demo'; note: string; say: string }
  | { kind: 'practice'; note: string; repeats: number; say: string }
  | { kind: 'check'; notes: string[]; say: string }
  | { kind: 'hold'; note: string; seconds: number; say: string }
  | { kind: 'echo'; notes: string[]; say: string }
  | { kind: 'summary'; say: string }

export interface Lesson {
  id: string
  number: number
  title: string
  goal: string
  steps: Step[]
}

export const LESSONS: Lesson[] = COURSE

export const TOTAL_LESSONS = 24

export const noteHebrew: Record<string, string> = { C: 'דו', D: 'רה', E: 'מי', F: 'פה', G: 'סול', A: 'לה', B: 'סי' }
export const hebrewName = (note: string) => noteHebrew[note.replace(/\d/, '')] ?? note
