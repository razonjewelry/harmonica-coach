export interface LessonProgress {
  completed: Record<string, { at: string; runs: number }>
  last: { lessonId: string; step: number } | null
}

const KEY = 'hc.progress.v1'

export const emptyProgress = (): LessonProgress => ({ completed: {}, last: null })

export function loadProgress(store: Pick<Storage, 'getItem'> = localStorage): LessonProgress {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return emptyProgress()
    const p = JSON.parse(raw) as LessonProgress
    if (typeof p !== 'object' || !p || typeof p.completed !== 'object') return emptyProgress()
    return { completed: p.completed ?? {}, last: p.last ?? null }
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

export function markCompleted(p: LessonProgress, lessonId: string, now = new Date()): LessonProgress {
  const prev = p.completed[lessonId]
  return {
    completed: { ...p.completed, [lessonId]: { at: now.toISOString(), runs: (prev?.runs ?? 0) + 1 } },
    last: null,
  }
}

export function resetProgress(): LessonProgress { return emptyProgress() }
