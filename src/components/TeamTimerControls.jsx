import { Btn, ConfirmBtn, Timer } from './ui.jsx'
import { store } from '../lib/store/index.js'
import { STEPS } from '../lib/config.js'

// One team's timer with its controls. The Game Master sees every team, a facilitator sees their own.
export function TeamTimerControls({ team, timer, dispatch, size = 36 }) {
  const has = timer.seconds != null
  const started = !!timer.endsAt
  const paused = !!timer.pausedAt
  const send = (action) => dispatch({ type: 'teamTimer', team, action, at: store.now() })
  if (!has) return <div className="hint">No timer at this step.</div>
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

// Back and Next for one team. A facilitator is limited to the steps between the first round and HQ.
export function TeamStepMover({ team, step, dispatch, gm = false, small = true }) {
  const last = STEPS.length - 1
  const lo = gm ? 0 : 1
  const hi = gm ? last : 8
  const go = (s) => dispatch({ type: 'teamStep', team, step: s, at: store.now() })
  const canBack = step - 1 >= lo && step >= lo
  const canNext = step + 1 <= hi && step <= hi
  const nextLabel = canNext ? STEPS[step + 1].label : 'End'
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <Btn small={small} variant="ghost" disabled={!canBack} onClick={() => go(step - 1)}>Back</Btn>
      <Btn small={small} disabled={!canNext} onClick={() => go(step + 1)}>Next: {nextLabel}</Btn>
    </div>
  )
}
