import { LAYOUT } from '../harmonica/notes'

export interface ParsedTab {
  notes: string[]
  beats: number[]
  /** כמה צלילים בכל פסוקית. פסוקית = שורה בטאבים או קטע שמסתיים ב-| */
  phrases: number[]
  error: string | null
}

const fail = (error: string): ParsedTab => ({ notes: [], beats: [], phrases: [], error })

/**
 * מפרש כתיבה בסגנון טאבים: "4+ 4+ 6+" (+ נשיפה, - שאיפה). אפשר גם "4↑ 4↓".
 * משך בפעימות אחרי נקודתיים: "6+:2". שורה חדשה או הקו | מסיימים פסוקית.
 */
export function parseTab(text: string): ParsedTab {
  const segments = text.split(/[\n\r|]+/).map((x) => x.replace(/,/g, ' ').trim()).filter(Boolean)
  const notes: string[] = []
  const beats: number[] = []
  const phrases: number[] = []
  for (const seg of segments) {
    let count = 0
    for (const t of seg.split(/\s+/).filter(Boolean)) {
      const m = /^(\d{1,2})([+\-↑↓])(?::(\d+(?:\.\d+)?))?$/.exec(t)
      if (!m) return fail(`לא הבנתי את "${t}". כתוב מספר חור ואז + לנשיפה או - לשאיפה, למשל 4+ או 5-`)
      const hole = Number(m[1])
      if (!LAYOUT[hole]) return fail(`חור ${hole} לא קיים. יש חורים 1 עד 10`)
      notes.push(LAYOUT[hole][m[2] === '+' || m[2] === '↑' ? 'blow' : 'draw'])
      beats.push(m[3] ? Math.min(8, Math.max(0.25, Number(m[3]))) : 1)
      count++
    }
    phrases.push(count)
  }
  if (!notes.length) return fail('לא הוזנו צלילים')
  return { notes, beats, phrases, error: null }
}

/** phrases: כמה צלילים בכל שורת מילים (מצב שורות). בלעדיו, הברה אחת לכל צליל */
export interface CustomSong { id: string; title: string; notes: string[]; lyrics: string[]; beats?: number[]; phrases?: number[] }
const KEY = 'hc.songs.v1'

export function loadSongs(store: Pick<Storage, 'getItem'> = localStorage): CustomSong[] {
  try {
    const v = JSON.parse(store.getItem(KEY) ?? '[]') as CustomSong[]
    return Array.isArray(v) ? v.filter((x) => x && Array.isArray(x.notes) && typeof x.title === 'string') : []
  } catch { return [] }
}
export function saveSongs(songs: CustomSong[], store: Pick<Storage, 'setItem'> = localStorage): void {
  try { store.setItem(KEY, JSON.stringify(songs)) } catch { /* ignore */ }
}

/** שורות מילים: כל שורה היא פסוקית. מספר ההברות (מילים/מקפים) חייב להיות כמספר הצלילים. */
export function countSyllables(lines: string[]): number {
  return lines.join(' ').split(/\s+/).filter(Boolean).reduce((n, w) => n + w.split('-').filter(Boolean).length, 0)
}
