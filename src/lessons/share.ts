import { LAYOUT } from '../harmonica/notes'
import type { CustomSong } from './tab'

// ---------- קידוד קומפקטי לקישור (הנתונים נשארים בחלק ה-# של הכתובת ולא נשלחים לשרת) ----------

function toB64Url(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function packJson(obj: unknown): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(obj))
  return toB64Url(await pipe(raw, new CompressionStream('deflate-raw')))
}
export async function unpackJson<T>(str: string): Promise<T> {
  const raw = await pipe(fromB64Url(str), new DecompressionStream('deflate-raw'))
  return JSON.parse(new TextDecoder().decode(raw)) as T
}

/** קישור שיפתח את השיר באפליקציה במכשיר אחר */
export async function songLink(base: string, song: CustomSong): Promise<string> {
  return `${base}#song=${await packJson(song)}`
}

// ---------- ייבוא מדף טאבים (שורות טאבים ומתחתן שורת מילים) ----------

const DASH = '-\\u2013\\u2212\\u2010\\u2011'
const TOKEN = new RegExp(`^[${DASH}]?\\d{1,2}[${DASH}]?$`)

export const isTabLine = (line: string): boolean => {
  const t = line.trim().split(/\s+/)
  return t.length >= 2 && t.every((x) => TOKEN.test(x))
}

export interface PageSong { title: string; notes: string[]; phrases: number[]; lyrics: string[] }

/** שורות מהדף: טאב, מילים, טאב, מילים... (מילים יכולות להיות ריקות). מינוס = שאיפה, בלי מינוס = נשיפה. */
export function parsePageLines(title: string, lines: string[]): PageSong | { error: string } {
  const notes: string[] = []
  const phrases: number[] = []
  const lyrics: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!isTabLine(line)) continue
    let count = 0
    for (const tok of line.split(/\s+/)) {
      const draw = new RegExp(`[${DASH}]`).test(tok)
      const hole = Number(tok.replace(/\D/g, ''))
      if (!LAYOUT[hole]) return { error: `חור ${hole} לא קיים במפוחית` }
      notes.push(LAYOUT[hole][draw ? 'draw' : 'blow'])
      count++
    }
    phrases.push(count)
    const next = (lines[i + 1] ?? '').trim()
    if (next && !isTabLine(next)) { lyrics.push(next.replace(/(?<=\S)-(?=\S)/g, '')); i++ } else lyrics.push('')
  }
  if (!notes.length) return { error: 'לא נמצאו טאבים בדף' }
  const clean = title.split('|')[0].trim()
  return { title: clean, notes, phrases, lyrics }
}

/** הסימנייה: רצה בדף הטאבים עצמו (במחשב), אוספת שורות טאבים והמילים שמתחתן, ופותחת את האפליקציה עם השיר */
export function bookmarklet(appUrl: string): string {
  const code = `(async()=>{const D='${DASH}';const re=new RegExp('^['+D+']?\\\\d{1,2}['+D+']?$');const raw=document.body.innerText.split(/\\n+/).map(s=>s.replace(/[\\u200e\\u200f]/g,'').trim()).filter(Boolean);const isTab=l=>{const t=l.split(/\\s+/);return t.length>=2&&t.every(x=>re.test(x))};const out=[];for(let i=0;i<raw.length;i++){if(isTab(raw[i])){out.push(raw[i]);const n=raw[i+1];if(n&&!isTab(n)&&n.length<200){out.push(n);i++}else out.push('')}}if(!out.length){alert('לא נמצאו טאבים בדף');return}const st=new Blob([JSON.stringify({t:document.title,l:out})]).stream().pipeThrough(new CompressionStream('deflate-raw'));const buf=new Uint8Array(await new Response(st).arrayBuffer());let s='';buf.forEach(b=>s+=String.fromCharCode(b));const b64=btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');window.open('${appUrl}#page='+b64,'_blank')})()`
  return 'javascript:' + encodeURIComponent(code)
}

/** טקסט שהועתק מדף שלם (בחר הכל > העתק): מוצא שורות טאבים ואת שורת המילים שמתחת לכל אחת */
export function parsePageText(title: string, text: string): PageSong | { error: string } {
  const raw = text.split(/\r?\n+/).map((x) => x.replace(/[\u200e\u200f]/g, '').trim()).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < raw.length; i++) {
    if (!isTabLine(raw[i])) continue
    out.push(raw[i])
    const n = raw[i + 1]
    if (n && !isTabLine(n) && n.length < 200) { out.push(n); i++ } else out.push('')
  }
  if (!out.length) return { error: 'לא מצאתי טאבים בטקסט שהועתק. ודא שהעתקת את כל הדף (בחר הכל ואז העתק).' }
  // אם לא נמסר שם, ננסה את השורה הראשונה שאינה טאב
  const guess = title || raw.find((l) => !isTabLine(l) && l.length < 60) || 'שיר חדש'
  return parsePageLines(guess, out)
}
