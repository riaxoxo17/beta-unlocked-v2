import { RoomIcon } from '../components/art.jsx'
import { useEffect, useState } from 'react'
import { useGame } from '../lib/useGame.jsx'
import { ROOMS, TEAMS, STEPS } from '../lib/config.js'
import { missionSummary, roleFor, roomFor, stampsOf, teamPlayers, timerFor } from '../lib/game.js'
import { store } from '../lib/store/index.js'
import { Btn, ConfirmBtn, Panel, TeamChip, Timer } from '../components/ui.jsx'
import { TwistPanel } from '../components/Twists.jsx'
import { TeamTimerControls, TeamStepMover } from '../components/TeamTimerControls.jsx'

export default function Facilitator() {
  const g = useGame()
  const [code, setCode] = useState('')
  const m = g.state.me
  const session = m?.role === 'facilitator' ? { team: m.teamId, name: m.name } : null
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

const login = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)
  try {
    await store.facilitatorLogin(code)
  } catch (err) {
    setError(err.message || 'That facilitator code is not recognised. Please check with the Game Master.')
  } finally {
    setLoading(false)
  }
}

const logout = async () => {
  await store.logout()
  setCode('')
}

  if (!session) {
    return (
      <div className="stage" data-room="hq" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
        <form className="panel" style={{ width: 'min(420px, 100%)', padding: 28, background: 'rgba(12,12,24,.9)' }} onSubmit={login}>
          <div className="hint">Beta: Unlocked, organising team</div>
          <h1 style={{ margin: '8px 0' }}>Team Facilitator</h1>
          <p className="muted">Enter the access code assigned to you by the Game Master. You'll only see the team you're looking after.</p>
          <label className="label" htmlFor="fac-code">Facilitator access code</label>
          <input id="fac-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          {error && <p role="alert" style={{ color: 'var(--bad)' }}>{error}</p>}
          <Btn style={{ width: '100%', marginTop: 12 }} disabled={loading}>
            {loading ? 'Verifying...' : 'Open team dashboard'}
          </Btn>
        </form>
      </div>
    )
  }

  return <FacilitatorDashboard session={session} onLogout={logout} game={g} />
}

// Read-only view of what the team has written so far in a room, so a facilitator can watch without playing.
function LiveView({ data, players }) {
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]))
  const show = (v) => (Array.isArray(v) ? v.map(show).join(', ') : typeof v === 'boolean' ? 'yes' : typeof v === 'number' && v > 1e11 ? 'done' : typeof v === 'object' && v ? JSON.stringify(v) : String(v))
  const rows = Object.entries(data || {})
    .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => [k.split(':').map((part) => names[part] || part).join(' / '), show(v)])
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Nothing entered yet. This view updates by itself as your team works.</p>
  return (
    <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflow: 'auto' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: 10, fontSize: 14 }}>
          <span className="hint">{k}</span>
          <span style={{ wordBreak: 'break-word' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

const STAGE_TEXT = { clue: 'the clue is on their screens', countdown: 'the countdown is running', name: 'the name is on their screens', done: 'the reveal is finished' }

function FacilitatorDashboard({ session, onLogout, game }) {
  const { state, ev, stepInfo, dispatch } = game
  const [hint, setHint] = useState('')
  const [revealError, setRevealError] = useState('')
  const revealStage = state.revealStatus?.[session.team] || null
  const reveal = (stage) => {
    setRevealError('')
    dispatch({ type: 'reveal', team: session.team, stage }).catch((e) => setRevealError(e.message))
  }
  const team = TEAMS.find((t) => t.id === session.team)
  const players = teamPlayers(state, session.team)
  const progress = state.teams[session.team]?.progress || {}
  const stepNow = game.myStep
  const phase = stepInfo.phase
  const room = phase === 'round' ? roomFor(session.team, stepInfo.round) : null
  const stamps = stampsOf(state, session.team)

  return (
    <div className="stage" data-room={room || 'hq'} style={{ paddingBottom: 50 }}>
      <header className="hud">
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', flexWrap: 'wrap' }}>
          <div>
            <div className="hint">Betta: Unlocked, team facilitator</div>
            <h1 style={{ margin: '3px 0', fontSize: 24 }}>Welcome, {session.name || 'Facilitator'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a className="btn btn-ghost btn-sm" href="#/screen" target="_blank" rel="noreferrer">Open big screen</a>
            <Btn small variant="ghost" onClick={onLogout}>Log out</Btn>
          </div>
        </div>
      </header>
      <main className="wrap" style={{ display: 'grid', gap: 16, paddingTop: 18 }}>
        <Panel style={{ borderColor: team.color }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="hint">YOUR ASSIGNED TEAM</div>
              <h2 style={{ margin: '5px 0' }}>{team.name}</h2>
              <TeamChip team={team} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hint">{stepInfo.label}</div>
              <Timer {...timerFor(ev, session.team)} size={36} />
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 0, marginTop: 14 }}>
            You watch and guide. You are a spectator, not a player, so you never join the missions. You run the controls below for your team.
          </p>
        </Panel>

        <Panel>
          <h3>Team roster ({players.length})</h3>
          {players.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {players.map((p, i) => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{p.name}</b><span className="hint">{stepInfo.round ? roleFor(i, stepInfo.round).name : 'Player'}</span></div>)}
            </div>
          ) : <p className="muted">Your players haven't checked in yet.</p>}
        </Panel>

        <Panel>
          <h3>Mission status</h3>
          {room ? (
            <>
              <div className="hint">{ROOMS[room].tag}</div>
              <h2 style={{ margin: '6px 0' }}><RoomIcon room={room} size={26} /> {ROOMS[room].title}</h2>
              <p className="muted">{ROOMS[room].mission}</p>
              <p><b>Team progress:</b> {missionSummary(room, progress[room] || {})}</p>
            </>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              {phase === 'lobby' ? 'The event has not started yet. Your team is at HQ.' : phase === 'transition' ? 'Your team is moving to its next room.' : phase === 'vault' ? 'The team is at the Identity Vault.' : 'Your team is back at headquarters.'}
            </p>
          )}
          {room && (
            <details open style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>Watch your team live (read only)</summary>
              <LiveView data={progress[room]} players={players} />
            </details>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {['chaos', 'brain', 'fearless', 'ignition'].map((r) => {
              const done = Boolean(progress[r]?.stamp)
              return <span key={r} className="chip" style={{ opacity: done ? 1 : .55 }}>{done ? '✓' : '○'} {ROOMS[r].short}</span>
            })}
          </div>
        </Panel>

        <Panel style={{ borderColor: team.color }}>
          <h3>Identity reveal for {team.name}</h3>
          {!ev.reveal?.authorised ? (
            <p className="muted" style={{ margin: 0 }}>The Game Master has not opened the reveal yet. Wait for the signal.</p>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Run this when your team stands at its door. Only your team sees the clue and the name. {revealStage ? `Right now: ${STAGE_TEXT[revealStage]}.` : 'Nothing is showing yet.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn disabled={['countdown', 'name'].includes(revealStage)} onClick={() => reveal('clue')}>1. Show the clue</Btn>
                <Btn disabled={revealStage !== 'clue'} onClick={() => reveal('countdown')}>2. Start the countdown</Btn>
                <Btn variant="ghost" disabled={!['countdown', 'name'].includes(revealStage)} onClick={() => reveal('done')}>3. Finish</Btn>
              </div>
              {revealError && <p role="alert" style={{ color: 'var(--bad)', marginBottom: 0 }}>{revealError}</p>}
              <p className="hint" style={{ marginBottom: 0 }}>When every team has finished, the Game Master shows all four names to everyone.</p>
            </>
          )}
        </Panel>

        <Panel style={{ borderColor: team.color }}>
          <h3>Move your team</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Right now: <b>{stepInfo.label}</b>. Move {team.name} on when they are ready. Only your team moves, and its timer restarts at the new step.
          </p>
          {phase !== 'round' && timerFor(ev, session.team).seconds != null && (
            <div style={{ marginBottom: 14 }}>
              <TeamTimerControls team={session.team} timer={timerFor(ev, session.team)} dispatch={dispatch} size={40} />
            </div>
          )}
          {stepNow >= 1 && stepNow <= 8 ? (
            <TeamStepMover team={session.team} step={stepNow} dispatch={dispatch} small={false} />
          ) : (
            <p className="muted" style={{ margin: 0 }}>{stepNow === 0 ? 'The Game Master starts your team from HQ.' : 'The Game Master moves your team from here.'}</p>
          )}
        </Panel>

        <Panel style={{ borderColor: team.color }}>
          <h3>Controls for this room</h3>
          {room ? (
            <>
              <p className="muted" style={{ marginTop: 0 }}>You can run {team.name} in {ROOMS[room].short} while they are there.</p>
              <div style={{ marginBottom: 16 }}>
                <div className="label">Timer for {ROOMS[room].short}</div>
                <TeamTimerControls team={session.team} timer={timerFor(ev, session.team)} dispatch={dispatch} size={40} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <Btn variant={stamps.includes(room) ? 'ghost' : undefined} onClick={() => dispatch({ type: 'teamField', team: session.team, mission: room, key: 'stamp', value: stamps.includes(room) ? null : store.now() })}>
                  {stamps.includes(room) ? 'Take back the stamp' : 'Award the stamp'}
                </Btn>
                <ConfirmBtn variant="ghost" onConfirm={() => dispatch({ type: 'resetMission', team: session.team, mission: room })}>
                  Reset this mission
                </ConfirmBtn>
              </div>
              {room === 'ignition' && (
                <div style={{ marginBottom: 14 }}>
                  <div className="label">Bring a moment to your team (any time, any order)</div>
                  <TwistPanel p={progress.ignition} put={(key, value) => dispatch({ type: 'teamField', team: session.team, mission: 'ignition', key, value })} />
                </div>
              )}
              <form
                style={{ display: 'flex', gap: 6 }}
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!hint.trim()) return
                  dispatch({ type: 'teamHint', team: session.team, hint: { id: store.now(), text: hint.trim() } })
                  setHint('')
                }}
              >
                <input className="input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Send a hint to your team" aria-label="Hint to your team" />
                <Btn small>Send</Btn>
              </form>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Controls open when your team is in a room.</p>
          )}
        </Panel>

        <Panel>
          <h3>Facilitator checklist</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 7 }}>
            <li>Make sure everyone understands the mission.</li>
            <li>Encourage quieter teammates to contribute.</li>
            <li>Keep an eye on the timer and transitions.</li>
            <li>Help the team organise its ideas and submissions.</li>
            <li>Let the players solve the challenge — don't solve it for them!</li>
          </ul>
        </Panel>
        <p className="hint">The Game Master can also move any team and run any timer.</p>
      </main>
    </div>
  )
}
