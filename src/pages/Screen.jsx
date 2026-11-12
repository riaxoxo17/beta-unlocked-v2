import { RoomIcon } from '../components/art.jsx'
import { useGame } from '../lib/useGame.jsx'
import { ROOMS, ROOM_ORDER, TEAMS, STEPS } from '../lib/config.js'
import { roomFor, stampsOf, rosterOf, timerFor, stepOf, stepInfoOf } from '../lib/game.js'
import { Timer } from '../components/ui.jsx'
import { useTimerAlerts } from '../lib/time.js'
import { FinalReveal, RevealOverlay, VaultDoors } from '../components/Vault.jsx'

// Share this page on a Meet/Zoom call or pin it in Gather. It shows what everyone should be looking at.
export default function Screen() {
  const { state, ev } = useGame()
  const steps = TEAMS.map((t) => stepOf(ev, t.id))
  const same = steps.every((x) => x === steps[0])
  const stepInfo = STEPS[Math.min(steps[0], STEPS.length - 1)]
  const phase = same ? stepInfo.phase : 'mixed'
  // Teams run their own clocks, so the shared screen stays quiet. Players hear their own timer.
  return (
    <div className="stage" data-room="hq" style={{ padding: '24px 4vw 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="pixel" style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700 }}>
          Betta: Unlocked
        </h1>
        <span style={{ fontSize: 'clamp(18px, 2.4vw, 30px)' }} className="muted">
          {same ? stepInfo.label : 'Each team moves at its own pace'}
        </span>
      </div>

      {phase === 'lobby' && (
        <div style={{ textAlign: 'center', marginTop: '12vh' }}>
          <h2 style={{ fontSize: 'clamp(30px, 6vw, 80px)' }}>Check in at headquarters</h2>
          <p className="muted" style={{ fontSize: 'clamp(16px, 2vw, 26px)' }}>
            {(state.roster || Object.values(state.players)).length} players are in.
          </p>
        </div>
      )}

      {phase !== 'lobby' && phase !== 'vault' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 28 }}>
          {TEAMS.map((t) => {
            const stamps = stampsOf(state, t.id)
            const si = stepInfoOf(ev, t.id)
            const tp = si.phase
            const roomNow = tp === 'round' ? roomFor(t.id, si.round) : tp === 'transition' ? roomFor(t.id, si.round + 1) : null
            return (
              <div key={t.id} className="panel" style={{ borderColor: t.color, boxShadow: `0 0 30px ${t.color}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="dot" style={{ '--c': t.color }} />
                  <b style={{ fontSize: 22 }}>{t.name}</b>
                  <span className="hint">{rosterOf(state, t.id).length} players</span>
                </div>
                <div style={{ margin: '14px 0', fontSize: 20 }}>
                  {roomNow ? (
                    <>
                      {tp === 'transition' ? 'Heading to ' : ''}
                      <RoomIcon room={roomNow} size={22} /> {ROOMS[roomNow].short}
                    </>
                  ) : (
                    tp === 'vault' ? 'At the identity vault' : 'At headquarters'
                  )}
                </div>
                {timerFor(ev, t.id).seconds != null && (
                  <div style={{ margin: '0 0 12px' }}>
                    <Timer {...timerFor(ev, t.id)} size={34} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }} aria-label={`${stamps.length} of 4 stamps`}>
                  {ROOM_ORDER.map((r) => (
                    <span key={r} title={ROOMS[r].short} style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `2px ${stamps.includes(r) ? 'solid' : 'dashed'} ${stamps.includes(r) ? t.color : 'var(--line)'}`, opacity: stamps.includes(r) ? 1 : 0.4 }}>
                      <RoomIcon room={r} size={18} />
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {phase === 'vault' && (
        <div style={{ marginTop: 40, display: 'grid', justifyItems: 'center', gap: 30 }}>
          <VaultDoors big />
        </div>
      )}
      <RevealOverlay />
      <FinalReveal />
    </div>
  )
}
