export interface LessonProgress {
  completed: Record<string, { at: string; runs: number; stars?: number }>
  last: { lessonId: string; step: number } | null
  /** רצף ימי תרגול */
  streak?: { day: string; count: number }
}

const KEY = 'hc.progress.v1'

export const emptyProgress = (): LessonProgress => ({ completed: {}, last: null })

export function loadProgress(store: Pick<Storage, 'getItem'> = localStorage): LessonProgress {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return emptyProgress()
    const p = JSON.parse(raw) as LessonProgress
    if (typeof p !== 'object' || !p || typeof p.completed !== 'object') return emptyProgress()
    return { completed: p.completed ?? {}, last: p.last ?? null, streak: p.streak }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: LessonProgress, store: Pick<Storage, 'setItem'> = localStorage): void {
  try { store.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

export function markStep(p: LessonProgress, lessonId: string, step: number): LessonProgress {
  return { ...p, last: { lessonId, step } }
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

/** מעדכן רצף ימים: היום כבר נספר = בלי שינוי, אתמול = +1, אחרת מתחילים מ-1 */
export function touchStreak(p: LessonProgress, now = new Date()): LessonProgress {
  const today = dayKey(now)
  if (p.streak?.day === today) return p
  const y = new Date(now); y.setDate(y.getDate() - 1)
  const count = p.streak?.day === dayKey(y) ? p.streak.count + 1 : 1
  return { ...p, streak: { day: today, count } }
}

/** כוכבים: 3 בלי דילוגים, 2 עם דילוג אחד, 1 אחרת. נשמר הטוב ביותר */
export const starsFor = (skips: number) => (skips === 0 ? 3 : skips === 1 ? 2 : 1)

export function markCompleted(p: LessonProgress, lessonId: string, now = new Date(), stars = 3): LessonProgress {
  const prev = p.completed[lessonId]
  return touchStreak({
    ...p,
    completed: { ...p.completed, [lessonId]: { at: now.toISOString(), runs: (prev?.runs ?? 0) + 1, stars: Math.max(prev?.stars ?? 0, stars) } },
    last: null,
  }, now)
}

export function resetProgress(): LessonProgress { return emptyProgress() }
