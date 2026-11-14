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
  private prev: string | null = null
  private released = true
  private silent = 0
  private releaseFrames: number
  private lastWrong: string | null = null

  constructor(targets: string[], releaseFrames = 2) {
    this.targets = targets
    this.releaseFrames = releaseFrames
  }

  get index() { return this.i }
  get target(): string | null { return this.targets[this.i] ?? null }
  get done() { return this.i >= this.targets.length }

  /** דילוג ידני על הצליל הנוכחי (למקרה שתקוע) */
  skip() {
    if (this.done) return
    this.prev = this.targets[this.i]
    this.i++
    this.released = false
    this.lastWrong = null
  }

  /** onset = תחילת צליל חדש לפי העוצמה (מאפשר לחזור על אותו צליל בלי שקט מלא) */
  push(m: NoteMatch | null, onset = false): SeqEvent {
    const idle = { index: this.i, done: this.done, advanced: false, wrong: null as string | null }
    if (this.done) return idle
    if (m === null) {
      this.silent++
      if (this.silent >= this.releaseFrames) { this.released = true; this.lastWrong = null }
      return { ...idle }
    }
    this.silent = 0
    if (onset) this.released = true
    if (m.note === this.targets[this.i]) {
      // אותו צליל כמו הקודם דורש הפסקה או תחילת צליל חדש; צליל שונה נספר מיד
      if (m.note === this.prev && !this.released) return idle
      this.i++
      this.prev = m.note
      this.released = false
      this.lastWrong = null
      return { index: this.i, done: this.done, advanced: true, wrong: null }
    }
    if (m.note === this.prev) return idle // הצליל הקודם עדיין נשמע
    const isNew = this.lastWrong !== m.note
    this.lastWrong = m.note
    return { ...idle, wrong: isNew ? m.note : null }
  }
}
