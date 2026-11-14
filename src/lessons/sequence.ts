import type { NoteMatch } from '../harmonica/pitch'

export interface SeqEvent {
  index: number // כמה צלילים כבר הושלמו
  done: boolean
  advanced: boolean // התקדמנו הרגע
  wrong: string | null // צליל שגוי יציב שנשמע
}

/**
 * מתאם רצף צלילים. כדי להתקדם צריך צליל יציב נכון, ואז הפסקה קצרה (שקט) לפני הצליל הבא.
 * כך אותו צליל ארוך לא נספר פעמיים, וצליל לא ברור לא נספר כלל.
 */
export class SequenceMatcher {
  private targets: string[]
  private i = 0
  private waitRelease = false
  private silent = 0
  private releaseFrames: number
  private lastWrong: string | null = null

  constructor(targets: string[], releaseFrames = 3) {
    this.targets = targets
    this.releaseFrames = releaseFrames
  }

  get index() { return this.i }
  get target(): string | null { return this.targets[this.i] ?? null }
  get done() { return this.i >= this.targets.length }

  push(m: NoteMatch | null): SeqEvent {
    if (this.done) return { index: this.i, done: true, advanced: false, wrong: null }
    if (m === null) {
      this.silent++
      if (this.silent >= this.releaseFrames) { this.waitRelease = false; this.lastWrong = null }
      return { index: this.i, done: false, advanced: false, wrong: null }
    }
    this.silent = 0
    if (this.waitRelease) return { index: this.i, done: false, advanced: false, wrong: null }
    if (m.note === this.targets[this.i]) {
      this.i++
      this.waitRelease = true
      this.lastWrong = null
      return { index: this.i, done: this.done, advanced: true, wrong: null }
    }
    const isNew = this.lastWrong !== m.note
    this.lastWrong = m.note
    return { index: this.i, done: false, advanced: false, wrong: isNew ? m.note : null }
  }
}
