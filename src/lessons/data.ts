import { MORE_LESSONS } from './lessons2'

// שיעורים מבוססי נתונים. כל שיעור: הסבר, הדגמה, תרגול, בדיקה וסיכום.
export type Step =
  | { kind: 'explain'; title: string; say: string }
  | { kind: 'demo'; note: string; say: string }
  | { kind: 'practice'; note: string; repeats: number; say: string }
  | { kind: 'check'; notes: string[]; say: string }
  | { kind: 'hold'; note: string; seconds: number; say: string }
  | { kind: 'summary'; say: string }

export interface Lesson {
  id: string
  number: number
  title: string
  goal: string
  steps: Step[]
}

const BASE_LESSONS: Lesson[] = [
  {
    id: 'l1',
    number: 1,
    title: 'היכרות ונשיפה',
    goal: 'להכיר את המפוחית ולנשוף צליל נקי בחורים 4, 5 ו-6',
    steps: [
      { kind: 'explain', title: 'המפוחית שלך', say: 'במפוחית יש עשרה חורים. חור מספר אחד נמצא משמאל, בצד של הצלילים הנמוכים. כל חור נותן צליל אחד בנשיפה וצליל אחר בשאיפה.' },
      { kind: 'explain', title: 'אחיזה ונשימה', say: 'החזק את המפוחית בשתי ידיים, והמספרים כלפי מעלה. נשוף בעדינות מהבטן, לא מהלחיים. אל תנשוף חזק. צליל נקי מגיע מאוויר רגוע.' },
      { kind: 'demo', note: 'C5', say: 'זה חור ארבע בנשיפה. הצליל הוא דו. הקשב לו.' },
      { kind: 'practice', note: 'C5', repeats: 3, say: 'עכשיו נשוף בחור ארבע. נסה להשמיע צליל אחד נקי. עשה את זה שלוש פעמים, עם הפסקה קצרה בין כל פעם.' },
      { kind: 'demo', note: 'E5', say: 'עכשיו חור חמש בנשיפה. הצליל הוא מי.' },
      { kind: 'practice', note: 'E5', repeats: 3, say: 'נשוף בחור חמש. שלוש פעמים.' },
      { kind: 'demo', note: 'G5', say: 'חור שש בנשיפה. הצליל הוא סול.' },
      { kind: 'practice', note: 'G5', repeats: 3, say: 'נשוף בחור שש. שלוש פעמים.' },
      { kind: 'check', notes: ['C5', 'E5', 'G5'], say: 'בדיקה. נשוף ברצף: חור ארבע, חמש, שש. עם הפסקה קצרה בין כל צליל.' },
      { kind: 'summary', say: 'כל הכבוד. למדת לנשוף בחורים ארבע, חמש ושש. אלה צלילי האקורד דו מז׳ור. בשיעור הבא נלמד שאיפה.' },
    ],
  },
  {
    id: 'l2',
    number: 2,
    title: 'שאיפה',
    goal: 'לשאוף צליל נקי בחורים 4, 5 ו-6',
    steps: [
      { kind: 'explain', title: 'שאיפה נכונה', say: 'שאיפה במפוחית היא עדינה. שאף לאט, כאילו אתה לוגם מקש. גם כאן, האוויר מגיע מהבטן.' },
      { kind: 'demo', note: 'D5', say: 'חור ארבע בשאיפה. הצליל הוא רה.' },
      { kind: 'practice', note: 'D5', repeats: 3, say: 'שאף בחור ארבע. שלוש פעמים, עם הפסקה בין כל פעם.' },
      { kind: 'demo', note: 'F5', say: 'חור חמש בשאיפה. הצליל הוא פה.' },
      { kind: 'practice', note: 'F5', repeats: 3, say: 'שאף בחור חמש. שלוש פעמים.' },
      { kind: 'demo', note: 'A5', say: 'חור שש בשאיפה. הצליל הוא לה.' },
      { kind: 'practice', note: 'A5', repeats: 3, say: 'שאף בחור שש. שלוש פעמים.' },
      { kind: 'check', notes: ['D5', 'F5', 'A5'], say: 'בדיקה. שאף ברצף: חור ארבע, חמש, שש.' },
      { kind: 'summary', say: 'יפה מאוד. עכשיו אתה מכיר נשיפה ושאיפה בשלושה חורים. בשיעור הבא נחבר ביניהם.' },
    ],
  },
  {
    id: 'l3',
    number: 3,
    title: 'נשיפה ושאיפה לסירוגין',
    goal: 'לעבור בין נשיפה לשאיפה בלי לזוז מהחור',
    steps: [
      { kind: 'explain', title: 'לא זזים', say: 'עכשיו נישאר באותו חור ונחליף בין נשיפה לשאיפה. הפה והשפתיים נשארים במקום. רק כיוון האוויר משתנה.' },
      { kind: 'demo', note: 'C5', say: 'חור ארבע. נשיפה היא דו.' },
      { kind: 'check', notes: ['C5', 'D5', 'C5', 'D5'], say: 'חור ארבע: נשוף, שאף, נשוף, שאף. לאט, עם הפסקה בין צליל לצליל.' },
      { kind: 'check', notes: ['E5', 'F5', 'E5', 'F5'], say: 'עכשיו חור חמש: נשוף, שאף, נשוף, שאף.' },
      { kind: 'check', notes: ['G5', 'A5', 'G5', 'A5'], say: 'ועכשיו חור שש: נשוף, שאף, נשוף, שאף.' },
      { kind: 'summary', say: 'מצוין. שלטת במעבר בין נשיפה לשאיפה. בשיעור הבא נעלה בסולם.' },
    ],
  },
  {
    id: 'l4',
    number: 4,
    title: 'סולם דו מז׳ור',
    goal: 'לנגן את הסולם דו מז׳ור עולה מחור 4 עד חור 7',
    steps: [
      { kind: 'explain', title: 'הסולם', say: 'סולם דו מז׳ור הוא דו, רה, מי, פה, סול, לה, סי, דו. במפוחית הוא עולה בצורה פשוטה: מתחילים בנשיפה בחור ארבע, ואז מחליפים נשיפה ושאיפה תוך כדי התקדמות לחורים הבאים.' },
      { kind: 'demo', note: 'C5', say: 'מתחילים בדו: חור ארבע, נשיפה.' },
      { kind: 'check', notes: ['C5', 'D5', 'E5'], say: 'שלב ראשון: דו, רה, מי. חור ארבע נשיפה, חור ארבע שאיפה, חור חמש נשיפה.' },
      { kind: 'check', notes: ['F5', 'G5', 'A5'], say: 'שלב שני: פה, סול, לה. חור חמש שאיפה, חור שש נשיפה, חור שש שאיפה.' },
      { kind: 'check', notes: ['B5', 'C6'], say: 'שלב שלישי: סי ודו. חור שבע שאיפה, ואז חור שבע נשיפה.' },
      { kind: 'check', notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'], say: 'בדיקה אחרונה: כל הסולם ברצף, לאט ובנחת.' },
      { kind: 'summary', say: 'כל הכבוד. ניגנת סולם שלם. עכשיו אתה מוכן לנגן את המנגינה הראשונה בספריית המנגינות.' },
    ],
  },
]

export const LESSONS: Lesson[] = [...BASE_LESSONS, ...MORE_LESSONS]

export const TOTAL_LESSONS = 24

export const noteHebrew: Record<string, string> = { C: 'דו', D: 'רה', E: 'מי', F: 'פה', G: 'סול', A: 'לה', B: 'סי' }
export const hebrewName = (note: string) => noteHebrew[note.replace(/\d/, '')] ?? note
