import { RoomIcon } from '../components/art.jsx'
import { useGame } from '../lib/useGame.jsx'
import { ROOMS, ROOM_ORDER, TEAMS } from '../lib/config.js'
import { roomFor, stampsOf, rosterOf, timerFor } from '../lib/game.js'
import { Timer } from '../components/ui.jsx'
import { useTimerAlerts } from '../lib/time.js'
import { FinalReveal, RevealOverlay, VaultDoors } from '../components/Vault.jsx'

// Share this page on a Meet/Zoom call or pin it in Gather. It shows what everyone should be looking at.
export default function Screen() {
  const { state, ev, stepInfo } = useGame()
  const phase = stepInfo.phase
  // Four rooms run four timers, so the shared screen stays quiet during rounds. Players hear their own room.
  useTimerAlerts(phase === 'round' ? {} : timerFor(ev, phase, null))
  return (
    <div className="stage" data-room="hq" style={{ padding: '24px 4vw 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="pixel" style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700 }}>
          Betta: Unlocked
        </h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{ fontSize: 'clamp(18px, 2.4vw, 30px)' }} className="muted">
            {stepInfo.label}
          </span>
          {phase !== 'round' && <Timer {...timerFor(ev, phase, null)} size={64} />}
        </div>
      </div>

      {phase === 'lobby' && (
        <div style={{ textAlign: 'center', marginTop: '12vh' }}>
          <h2 style={{ fontSize: 'clamp(30px, 6vw, 80px)' }}>Check in at headquarters</h2>
          <p className="muted" style={{ fontSize: 'clamp(16px, 2vw, 26px)' }}>
            {(state.roster || Object.values(state.players)).length} players are in.
          </p>
        </div>
      )}

      {(phase === 'round' || phase === 'transition' || phase === 'hq') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 28 }}>
          {TEAMS.map((t) => {
            const stamps = stampsOf(state, t.id)
            const roomNow = phase === 'round' ? roomFor(t.id, stepInfo.round) : phase === 'transition' ? roomFor(t.id, stepInfo.round + 1) : null
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
                      {phase === 'transition' ? 'Heading to ' : ''}
                      <RoomIcon room={roomNow} size={22} /> {ROOMS[roomNow].short}
                    </>
                  ) : (
                    'At headquarters'
                  )}
                </div>
                {phase === 'round' && roomNow && (
                  <div style={{ margin: '0 0 12px' }}>
                    <Timer {...timerFor(ev, phase, roomNow)} size={34} />
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
