import type { MicFrame } from '../audio/useMic'
import { hebrewName } from '../lessons/data'
import { holeLabel } from './HarmonicaView'

/** תצוגת צליל חי + סטייה בסנטים. "יציב" רק כשהמנוע בטוח. */
export function NoteMeter({ frame }: { frame: MicFrame | null }) {
  if (!frame || !frame.raw) return <div className="meter idle">מחכה לצליל...</div>
  const { note, cents } = frame.raw
  const stable = frame.stable?.note === note
  const pos = Math.max(-50, Math.min(50, cents)) + 50
  return (
    <div className={`meter ${stable ? 'stable' : 'unsure'}`}>
      <div className="big">{note} <small>({hebrewName(note)})</small></div>
      <div className="sub">{holeLabel(note)} · {stable ? 'צליל יציב' : 'לא יציב, נסה להחזיק'}</div>
      <div className="bar"><i style={{ left: `${pos}%` }} /></div>
      <div className="sub">{cents === 0 ? 'מדויק' : cents > 0 ? `גבוה ב-${cents} סנט` : `נמוך ב-${-cents} סנט`}</div>
    </div>
  )
}
