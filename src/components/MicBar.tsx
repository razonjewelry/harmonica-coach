import { MIC_MESSAGES } from '../audio/useMic'
import type { MicStatus } from '../audio/useMic'

export function MicBar({ status, onStart }: { status: MicStatus; onStart: () => void }) {
  if (status === 'on') return <div className="mic ok">🎙️ {MIC_MESSAGES.on}</div>
  return (
    <div className="mic">
      <div>{MIC_MESSAGES[status]}</div>
      {(status === 'idle' || status === 'denied' || status === 'error' || status === 'nodevice') && (
        <button className="btn primary" onClick={onStart}>הפעל מיקרופון</button>
      )}
    </div>
  )
}
