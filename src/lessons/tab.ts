import { LAYOUT } from '../harmonica/notes'

export interface ParsedTab { notes: string[]; beats: number[]; error: string | null }

/** מפרש כתיבה בסגנון טאבים: "4+ 4+ 6+" (+ נשיפה, - שאיפה). אפשר גם "4↑ 4↓". משך בפעימות אחרי נקודתיים: "6+:2" */
export function parseTab(text: string): ParsedTab {
  const tokens = text.replace(/[,\n\r]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const notes: string[] = []
  const beats: number[] = []
  for (const t of tokens) {
    const m = /^(\d{1,2})([+\-↑↓])(?::(\d+(?:\.\d+)?))?$/.exec(t)
    if (!m) return { notes: [], beats: [], error: `לא הבנתי את "${t}". כתוב מספר חור ואז + לנשיפה או - לשאיפה, למשל 4+ או 5-` }
    const hole = Number(m[1])
    if (!LAYOUT[hole]) return { notes: [], beats: [], error: `חור ${hole} לא קיים. יש חורים 1 עד 10` }
    notes.push(LAYOUT[hole][m[2] === '+' || m[2] === '↑' ? 'blow' : 'draw'])
    beats.push(m[3] ? Math.min(8, Math.max(0.25, Number(m[3]))) : 1)
  }
  if (!notes.length) return { notes: [], beats: [], error: 'לא הוזנו צלילים' }
  return { notes, beats, error: null }
}

export interface CustomSong { id: string; title: string; notes: string[]; lyrics: string[]; beats?: number[] }
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
