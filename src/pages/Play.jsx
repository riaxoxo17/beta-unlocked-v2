import { RoomIcon, RoomScene, Avatar } from '../components/art.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../lib/useGame.jsx'
import { ROLES, ROOMS, TEAMS } from '../lib/config.js'
import { nav, isEmbed } from '../lib/router.js'
import { Panel, Timer, Btn, TeamChip } from '../components/ui.jsx'
import Passport from '../components/Passport.jsx'
import { FinalReveal, RevealOverlay, VaultDoors } from '../components/Vault.jsx'
import { isMuted, setMuted } from '../lib/audio.js'
import Chaos from './missions/Chaos.jsx'
import Brain from './missions/Brain.jsx'
import Fearless from './missions/Fearless.jsx'
import Ignition from './missions/Ignition.jsx'
import { roleFor, timerFor } from '../lib/game.js'
import { useTimerAlerts, useTimeUp } from '../lib/time.js'

const MISSIONS = { chaos: Chaos, brain: Brain, fearless: Fearless, ignition: Ignition }

export function Sparks() {
  const sparks = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ left: (i * 6.4 + Math.random() * 5) % 100, dur: 5 + Math.random() * 6, delay: Math.random() * 6, dx: (Math.random() - 0.5) * 160 })), [])
  return sparks.map((s, i) => <span key={i} className="spark" style={{ left: s.left + 'vw', animationDuration: s.dur + 's', animationDelay: s.delay + 's', '--dx': s.dx + 'px' }} />)
}

function HintBanner() {
  const { state, teamId } = useGame()
  const hint = state.teams[teamId]?.hint
  const [seen, setSeen] = useState(() => localStorage.getItem('beta:hintSeen'))
  if (!hint || seen === String(hint.id)) return null
  return (
    <div className="wrap" style={{ marginTop: 12 }}>
      <Panel style={{ borderColor: 'var(--accent)', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }} role="status">
        <span>
          <b>Message from the Game Master:</b> {hint.text}
        </span>
        <Btn small variant="ghost" onClick={() => (localStorage.setItem('beta:hintSeen', String(hint.id)), setSeen(String(hint.id)))}>
          Got it
        </Btn>
      </Panel>
    </div>
  )
}

function Briefing() {
  const { players, myIdx, role, state } = useGame()
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h2 style={{ marginBottom: 8 }}>Welcome to Betta headquarters</h2>
        <p style={{ margin: 0 }}>
          You thought this was an introduction. It is a mission. Four teams will rotate through four rooms. Each room earns your team a stamp, and four
          stamps unlock something that already belongs to you.
        </p>
      </Panel>
      <Panel>
        <div className="label">How it works</div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>Your team is a group of Chapter Leaders. Everyone starts in a different room.</li>
          <li>Each round lasts about seven minutes, then you move on. This page always shows your team's current mission.</li>
          <li>Everyone has a role, and roles rotate every round.</li>
          <li>Your answers are shared. When a teammate types, you all see it.</li>
          <li>Your identity stays sealed until the vault.</li>
        </ul>
      </Panel>
      <Panel>
        <div className="label">Your role this round</div>
        <b style={{ fontSize: 20 }}>{role.name}</b>
        <div className="muted">{role.desc}</div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>All five roles</summary>
          <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
            {ROLES.map((r) => (
              <div key={r.id}>
                <b>{r.name}</b>: <span className="muted">{r.desc}</span>
              </div>
            ))}
          </div>
        </details>
      </Panel>
      <TeamRoster />
    </div>
  )
}

function TeamRoster() {
  const { players, me, round } = useGame()
  return (
    <Panel>
      <div className="label">Your team ({players.length})</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {players.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={p.name} color={TEAMS.find((t) => t.id === p.team).color} size={36} />
            <span style={{ flex: 1 }}>
              {p.name} {p.id === me.id && <span className="hint">(you)</span>}
            </span>
            <span className="muted">{roleFor(i, round).name}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Transition() {
  const { nextRoom, ev, teamId } = useGame()
  const r = ROOMS[nextRoom]
  return (
    <Panel style={{ textAlign: 'center', padding: 40 }}>
      <RoomIcon room={nextRoom} size={72} />
      <h2 style={{ margin: '10px 0 6px' }}>Next stop: {r.title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Head there together. Roles rotate, so check yours when you arrive.
      </p>
      <Timer {...timerFor(ev, teamId)} size={48} />
    </Panel>
  )
}

export default function Play() {
  const g = useGame()
  const [tab, setTab] = useState('mission')
  const [muted, setM] = useState(isMuted())
  const embed = isEmbed()
  const myTimer = timerFor(g.ev, g.teamId)
  useTimerAlerts(myTimer)
  const timeUp = useTimeUp(myTimer)

  useEffect(() => {
    if (!g.me && g.state.loaded) nav(g.auth === 'facilitator' ? '/facilitator' : g.auth === 'gm' ? '/gm' : '/')
  }, [g.me, g.state.loaded])
  if (!g.me) return <div className="stage" data-room="hq" />

  const team = TEAMS.find((t) => t.id === g.teamId)
  const phase = g.stepInfo.phase
  const room = g.room
  const theme = phase === 'round' ? room : 'hq'
  const Mission = room ? MISSIONS[room] : null

  return (
    <div className="stage" data-room={theme}>
      {theme === 'ignition' && <Sparks />}
      <header className="hud">
        <div className="wrap hud-row">
          <div className="hud-who">
            <Avatar name={g.me.name} color={team.color} size={34} />
            <div style={{ minWidth: 0 }}>
              <div className="hud-name">{g.me.name}</div>
              <div className="hint" style={{ whiteSpace: 'nowrap' }}>
                {team.name} · {g.role.name}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="hint hud-step">{g.stepInfo.label}</span>
            <Timer {...myTimer} />
            <button className="btn btn-ghost btn-sm" onClick={() => (setMuted(!muted), setM(!muted))} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
        <div className="wrap tabs" role="tablist">
          {[['mission', 'Mission'], ['passport', 'Passport'], ['team', 'Team']].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <HintBanner />

      <main className="wrap" style={{ padding: '18px 0 60px' }}>
        {tab === 'passport' && <Passport />}
        {tab === 'team' && <TeamRoster />}
        {tab === 'mission' && (
          <>
            {phase === 'lobby' && <Briefing />}
            {phase === 'round' && Mission && (
              <>
                <div className="room-banner">
                  <RoomScene room={room} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="hint">{ROOMS[room].tag}</div>
                  <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)' }}>
                    <RoomIcon room={room} size={34} /> {ROOMS[room].title}
                  </h1>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Mission: {ROOMS[room].mission}. Your role: <b style={{ color: 'var(--ink)' }}>{g.role.name}</b>, {g.role.desc.toLowerCase()}
                  </div>
                </div>
                <Mission />
              </>
            )}
            {phase === 'transition' && <Transition />}
            {phase === 'hq' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <Panel>
                  <h2>Back at headquarters</h2>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Check your passport. Every stamp counts towards the reveal.
                  </p>
                </Panel>
                <Passport />
              </div>
            )}
            {phase === 'vault' && (
              <div style={{ display: 'grid', gap: 24, justifyItems: 'center' }}>
                <h2 style={{ textAlign: 'center' }}>The identity vault</h2>
                <VaultDoors myTeam={g.teamId} />
                <p className="muted" style={{ textAlign: 'center', maxWidth: 520 }}>
                  Four doors, four identities. Walk to your door and wait for the host. Nobody knows what is behind them yet.
                </p>
              </div>
            )}
          </>
        )}
      </main>
      {phase === 'round' && timeUp && (
        <div className="timeup" role="alert">
          <div>
            <h1 className="pixel" style={{ fontSize: 'clamp(40px, 10vw, 96px)', color: 'var(--bad)' }}>Time is up</h1>
            <p className="muted" style={{ fontSize: 20 }}>Hands off. Wait for the Game Master to move everyone on.</p>
          </div>
        </div>
      )}
      <RevealOverlay />
      <FinalReveal />
    </div>
  )
}
