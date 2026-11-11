import { Btn, ConfirmBtn, Timer } from './ui.jsx'
import { store } from '../lib/store/index.js'

// One room's timer with its controls. Used by the Game Master (every room) and by a facilitator (the room their team is in).
export function RoomTimerControls({ room, timer, dispatch, size = 36 }) {
  const started = !!timer.endsAt
  const paused = !!timer.pausedAt
  const send = (action) => dispatch({ type: 'roomTimer', room, action, at: store.now() })
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Timer endsAt={timer.endsAt} pausedAt={timer.pausedAt} seconds={timer.seconds} size={size} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!started && <Btn small onClick={() => send('start')}>Start</Btn>}
        {started && !paused && <Btn small variant="ghost" onClick={() => send('pause')}>Pause</Btn>}
        {paused && <Btn small onClick={() => send('resume')}>Resume</Btn>}
        <Btn small variant="ghost" onClick={() => send('extend')}>+1 min</Btn>
        {started && (
          <ConfirmBtn small variant="ghost" onConfirm={() => send('restart')}>
            Restart
          </ConfirmBtn>
        )}
      </div>
    </div>
  )
}
