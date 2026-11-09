import { RoomIcon } from '../components/art.jsx'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../lib/useGame.jsx'
import { ROOMS, ROOM_ORDER, STEPS, TEAMS, COUNTDOWN_SECONDS } from '../lib/config.js'
import { missionSummary, roleFor, roomFor, stampsOf, stepDuration, teamIndex, teamPlayers } from '../lib/game.js'
import { store } from '../lib/store/index.js'
import { Btn, ConfirmBtn, Panel, Timer } from '../components/ui.jsx'
import { BROKER } from './missions/Fearless.jsx'

const KEY = 'beta:gm'

export default function GM() {
  const [code, setCode] = useState(() => sessionStorage.getItem(KEY) || '')
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

useEffect(() => {
  store.reconnect().then((session) => {
    if (session?.me?.role === 'gm') setOk(true)
  })
}, [])

  if (!ok) {
    return (
      <div className="stage" data-room="hq" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
        <form
          className="panel"
          style={{ width: 'min(380px, 100%)', background: 'rgba(12,12,24,.9)' }}
          onSubmit={async (e) => {
            e.preventDefault()
            setErr('')
            setLoading(true)

            try {
              await store.gmCheck(code)
              sessionStorage.removeItem(KEY)
              setOk(true)
            } catch (error) {
              setErr(error.message || 'Wrong passcode.')
            } finally {
              setLoading(false)
            }
          }}
        >
          <h2 style={{ marginBottom: 12 }}>Game Master</h2>
          <label className="label" htmlFor="gmc">Passcode</label>
          <input id="gmc" type="password" className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
          <Btn style={{ marginTop: 12, width: '100%' }} disabled={loading}>
            {loading ? 'Checking...' : 'Enter'}
          </Btn>
          {store.mode === 'local' && <p className="hint">Rehearsal mode passcode: gm</p>}
        </form>
      </div>
    )
  }
  return <Dashboard code={code} />
}

function Dashboard({ code }) {
  const [tab, setTab] = useState('run')
  const { state, ev, stepInfo, dispatch } = useGame()
  const last = STEPS.length - 1

  const goStep = (n) => {
    const i = Math.max(0, Math.min(last, n))
    const dur = stepDuration(i, ev)
    const now = store.now()
    dispatch({ type: 'event', patch: { step: i, stepStartedAt: now, endsAt: dur ? now + dur * 1000 : null } }, code)
  }

  // Optional auto-advance, only while this dashboard stays open.
  const stateRef = useRef({ ev, goStep })
  stateRef.current = { ev, goStep }
  useEffect(() => {
    const id = setInterval(() => {
      const { ev: e, goStep: go } = stateRef.current
      const ph = STEPS[e.step].phase
      if (e.auto && e.endsAt && store.now() > e.endsAt && (ph === 'round' || ph === 'transition')) go(e.step + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const patch = (p) => dispatch({ type: 'event', patch: p }, code)
  const nextLabel = ev.step < last ? STEPS[ev.step + 1].label : 'End'
  const playerCount = (state.roster || Object.values(state.players)).length

  return (
    <div className="stage" data-room="hq" style={{ paddingBottom: 60 }}>
      <header className="hud">
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', gap: 12, flexWrap: 'wrap' }}>
          <b className="pixel" style={{ fontSize: 20 }}>Game Master</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="chip">{store.mode === 'supabase' ? 'Live (Supabase)' : 'Rehearsal (local)'}</span>
            <span className="muted">{playerCount} joined</span>
            <a className="btn btn-ghost btn-sm" href="#/screen" target="_blank" rel="noreferrer">Open big screen</a>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ display: 'grid', gap: 18, paddingTop: 18 }}>
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div className="hint">Now ({ev.step + 1}/{STEPS.length})</div>
              <h2>{stepInfo.label}</h2>
            </div>
            <Timer endsAt={ev.endsAt} size={44} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn variant="ghost" disabled={ev.step === 0} onClick={() => goStep(ev.step - 1)}>Back</Btn>
              <Btn variant="ghost" disabled={!ev.endsAt} onClick={() => patch({ endsAt: ev.endsAt + 60000 })}>+1 min</Btn>
              <Btn disabled={ev.step === last} onClick={() => goStep(ev.step + 1)}>Next: {nextLabel}</Btn>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 16, alignItems: 'center' }}>
            <label><input type="checkbox" checked={ev.auto} onChange={(e) => patch({ auto: e.target.checked })} /> Auto-advance rounds and moves (this tab must stay open)</label>
            <label><input type="checkbox" checked={ev.autoBroker} onChange={(e) => patch({ autoBroker: e.target.checked })} /> Broker releases pieces automatically</label>
            <label>Round <input type="number" min="1" max="15" className="input" style={{ width: 70, display: 'inline-block' }} value={Math.round(ev.roundSeconds / 60)} onChange={(e) => patch({ roundSeconds: Math.max(1, +e.target.value) * 60 })} /> min</label>
            <label>Move <input type="number" min="10" max="300" className="input" style={{ width: 80, display: 'inline-block' }} value={ev.transitionSeconds} onChange={(e) => patch({ transitionSeconds: Math.max(10, +e.target.value) })} /> sec</label>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>Timer changes apply from the next step.</p>
        </Panel>

        <div className="tabs" role="tablist" style={{ borderBottom: '1px solid var(--line)' }}>
          {[['run', 'Run the event'], ['reveal', 'Identity reveal'], ['setup', 'Setup and reset']].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>

        {tab === 'run' && (
          <>
            <BrokerQueue code={code} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              {TEAMS.map((t) => (
                <TeamCard key={t.id} team={t} code={code} />
              ))}
            </div>
          </>
        )}

        {tab === 'reveal' && <Vault code={code} />}

        {tab === 'setup' && <FacilitatorAssignments code={code} />}

        {tab === 'setup' && <Panel>
          <h3 style={{ marginBottom: 12 }}>Reset</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ConfirmBtn variant="danger" onConfirm={() => dispatch({ type: 'resetProgress' }, code)}>Reset progress, keep players</ConfirmBtn>
            <ConfirmBtn variant="danger" onConfirm={() => dispatch({ type: 'resetAll' }, code)}>Reset everything</ConfirmBtn>
          </div>
        </Panel>}
      </main>
    </div>
  )
}

function FacilitatorAssignments({ code }) {
  const [rows, setRows] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    store.facilitatorList().then((data) => {
      const mapped = Object.fromEntries(
        (data || []).map((item) => [
          item.team,
          { name: item.name || '', code: '' }
        ])
      )

      setRows(mapped)
      setLoaded(true)
    }).catch(() => {
      setRows({})
      setLoaded(true)
      setMessage('Could not load facilitator assignments.')
    })
  }, [])

  const edit = (team, key, value) => setRows((old) => ({ ...old, [team]: { ...(old[team] || {}), [key]: value } }))
  const save = async (team) => {
    const row = rows[team] || {}
    if (!row.name?.trim() || !row.code?.trim()) {
      setMessage('Enter both a facilitator name and an access code for each assigned team.')
      return
    }
    const duplicate = Object.entries(rows).some(([otherTeam, other]) => otherTeam !== team && other?.code?.trim().toUpperCase() === row.code.trim().toUpperCase())
    if (duplicate) {
      setMessage('Each facilitator needs a unique access code.')
      return
    }
    try {
      await store.facilitatorAssign(team, row.name.trim(), row.code.trim())
      setMessage(`${TEAMS.find((t) => t.id === team).name} facilitator saved.`)
    } catch (e) {
      setMessage(e.message || 'Could not save the facilitator.')
    }
    setTimeout(() => setMessage(''), 3500)
  }

  return (
    <Panel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Team facilitators</h3>
          <p className="hint" style={{ margin: 0 }}>Manually assign one organising-team member to look after each team. Facilitators are not counted as players.</p>
        </div>
        <a className="btn btn-ghost btn-sm" href="#/facilitator" target="_blank" rel="noreferrer">Open facilitator login</a>
      </div>
      {!loaded ? <p className="muted">Loading assignments…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
          {TEAMS.map((t) => (
            <div key={t.id} className="panel" style={{ borderColor: t.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="dot" style={{ '--c': t.color }} />
                <b>{t.name}</b>
              </div>
              <label className="label" htmlFor={`fac-name-${t.id}`}>Facilitator name</label>
              <input id={`fac-name-${t.id}`} className="input" value={rows[t.id]?.name || ''} onChange={(e) => edit(t.id, 'name', e.target.value)} placeholder="Enter name" />
              <label className="label" htmlFor={`fac-code-${t.id}`} style={{ marginTop: 9 }}>Access code</label>
              <input id={`fac-code-${t.id}`} className="input" value={rows[t.id]?.code || ''} onChange={(e) => edit(t.id, 'code', e.target.value.toUpperCase())} placeholder="Set a unique code" autoComplete="off" />
              <Btn small style={{ marginTop: 10 }} onClick={() => save(t.id)}>Save assignment</Btn>
            </div>
          ))}
        </div>
      )}
      <p className="hint" role="status" style={{ marginBottom: 0, marginTop: 12 }}>{message}</p>
      {store.mode === 'local' && <p className="hint" style={{ marginBottom: 0 }}>Rehearsal mode: assignments are saved in this browser. Live-mode secure facilitator access will be added with the Supabase setup.</p>}
    </Panel>
  )
}

function BrokerQueue({ code }) {
  const { state, dispatch } = useGame()
  const waiting = TEAMS.filter((t) => {
    const f = state.teams[t.id].progress.fearless
    return f['c2:offerAt'] && !f['c2:received']
  })
  if (!waiting.length) return null
  return (
    <Panel style={{ borderColor: 'var(--accent)' }}>
      <h3 style={{ marginBottom: 10 }}>The Broker has offers waiting</h3>
      {waiting.map((t) => {
        const b = BROKER[teamIndex(t.id)]
        return (
          <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <span className="dot" style={{ '--c': t.color, display: 'inline-block', marginRight: 8 }} />
              <b>{t.name}</b> wants <b>{b.need[0]}</b>: “{state.teams[t.id].progress.fearless['c2:offer']}”
            </div>
            <Btn small onClick={() => dispatch({ type: 'teamField', team: t.id, mission: 'fearless', key: 'c2:received', value: b.need[1] }, code)}>
              Release {b.need[0]}: {b.need[1]}
            </Btn>
          </div>
        )
      })}
    </Panel>
  )
}

function TeamCard({ team, code }) {
  const { state, ev, stepInfo, dispatch } = useGame()
  const players = teamPlayers(state, team.id)
  const progress = state.teams[team.id].progress
  const stamps = stampsOf(state, team.id)
  const [hint, setHint] = useState('')
  const phase = stepInfo.phase
  const roomNow = phase === 'round' ? roomFor(team.id, stepInfo.round) : null
  const round = stepInfo.round || 1

  const setStamp = (r, on) => dispatch({ type: 'teamField', team: team.id, mission: r, key: 'stamp', value: on ? store.now() : null }, code)

  return (
    <Panel style={{ borderColor: team.color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="dot" style={{ '--c': team.color }} />
        <b style={{ fontSize: 20 }}>{team.name}</b>
        <span className="hint">{team.colorName}, code {team.code}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        {roomNow ? <b><RoomIcon room={roomNow} size={16} /> {ROOMS[roomNow].short}</b> : <span className="muted">Not in a room</span>}
        {roomNow && <div className="muted" style={{ fontSize: 14 }}>{missionSummary(roomNow, progress[roomNow])}</div>}
      </div>
      <div style={{ marginBottom: 10 }}>
        {players.length === 0 && <span className="hint">No players yet.</span>}
        {players.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>{p.name}</span>
            <span className="hint">
              {roleFor(i, round).name}{' '}
              <button style={{ background: 'none', border: 0, color: 'var(--bad)', cursor: 'pointer' }} aria-label={`Remove ${p.name}`} onClick={() => dispatch({ type: 'removePlayer', id: p.id })}>✕</button>
            </span>
          </div>
        ))}
      </div>
      <div className="label">Stamps (click to award or take back)</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {ROOM_ORDER.map((r) => (
          <button key={r} className="btn btn-ghost btn-sm" style={{ opacity: stamps.includes(r) ? 1 : 0.45, borderColor: stamps.includes(r) ? team.color : undefined }} onClick={() => setStamp(r, !stamps.includes(r))} aria-pressed={stamps.includes(r)} title={ROOMS[r].short}>
            <RoomIcon room={r} size={16} />
          </button>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 6, marginBottom: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!hint.trim()) return
          dispatch({ type: 'teamHint', team: team.id, hint: { id: store.now(), text: hint.trim() } })
          setHint('')
        }}
      >
        <input className="input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Send a hint or message" aria-label={`Message to ${team.name}`} />
        <Btn small>Send</Btn>
      </form>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 14 }}>Reset a mission</summary>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {ROOM_ORDER.map((r) => (
            <ConfirmBtn key={r} small variant="ghost" onConfirm={() => dispatch({ type: 'resetMission', team: team.id, mission: r }, code)}>
              <RoomIcon room={r} size={14} /> {ROOMS[r].short}
            </ConfirmBtn>
          ))}
        </div>
      </details>
    </Panel>
  )
}

function Vault({ code }) {
  const { ev, state, dispatch } = useGame()
  const [rows, setRows] = useState(null)
  const [saved, setSaved] = useState('')
  const authorised = !!ev.reveal?.authorised
  const status = state.revealStatus || {}
  const revealedCount = TEAMS.filter((t) => ['name', 'done'].includes(status[t.id])).length

  useEffect(() => {
    store.vaultGet().then((data) => {
      setRows(data || {})
    }).catch(() => {
      setRows({})
    })
  }, [])

  const flag = (key, value) => dispatch({ type: 'revealFlag', key, value })
  const stage = (team, st) => dispatch({ type: 'reveal', team, stage: st }).catch((e) => setSaved(e.message))

  const edit = (t, k, v) => setRows((r) => ({ ...r, [t]: { ...r[t], [k]: v } }))
  const save = async (t) => {
    try {
      await store.vaultSet(t, rows[t])
      setSaved(`${TEAMS.find((x) => x.id === t).name} saved`)
    } catch (e) {
      setSaved(e.message || 'Save failed.')
    }
    setTimeout(() => setSaved(''), 2500)
  }
  const shuffle = async () => {
    const ids = TEAMS.map((t) => t.id)
    const data = ids.map((i) => rows[i])
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[data[i], data[j]] = [data[j], data[i]]
    }
    const next = Object.fromEntries(ids.map((id, i) => [id, data[i]]))
    setRows(next)
    try {
      for (const id of ids) await store.vaultSet(id, next[id])
      setSaved('Shuffled and saved')
    } catch (e) {
      setSaved(e.message || 'Save failed.')
    }
    setTimeout(() => setSaved(''), 2500)
  }

  return (
    <Panel>
      <h3 style={{ marginBottom: 6 }}>Identity vault</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Open the reveal, then each team's facilitator runs their own team's clue, countdown and name. You can run any team too. When every team has seen its name, show all four to everyone at once.
      </p>
      <label style={{ display: 'block', margin: '8px 0 14px' }}>
        <input type="checkbox" checked={authorised} onChange={(e) => flag('authorised', e.target.checked)} /> <b>Reveal open</b> <span className="hint">(facilitators can start only while this is on)</span>
      </label>
      {!rows ? (
        <p className="muted">Loading vault…</p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {TEAMS.map((t) => (
            <div key={t.id} className="panel" style={{ borderColor: t.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className="dot" style={{ '--c': t.color }} />
                <b>Door {String(t.door).padStart(2, '0')}, {t.name}</b>
                {status[t.id] && <span className="chip">{{ clue: 'Clue on their screens', countdown: 'Countdown running', name: 'Name revealed', done: 'Name revealed' }[status[t.id]]}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <input className="input" aria-label={`Name behind door ${t.door}`} value={rows[t.id]?.name || ''} onChange={(e) => edit(t.id, 'name', e.target.value)} placeholder="Name" />
                <input className="input" aria-label={`Tagline for door ${t.door}`} value={rows[t.id]?.tagline || ''} onChange={(e) => edit(t.id, 'tagline', e.target.value)} placeholder="Tagline" />
              </div>
              <textarea className="input" rows={2} style={{ marginTop: 8 }} aria-label={`Clue for door ${t.door}`} value={rows[t.id]?.clue || ''} onChange={(e) => edit(t.id, 'clue', e.target.value)} placeholder="Cryptic clue shown before the countdown" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <Btn small variant="ghost" onClick={() => save(t.id)}>Save</Btn>
                <Btn small disabled={!authorised} onClick={() => stage(t.id, 'clue')}>1. Show clue</Btn>
                <Btn small disabled={!authorised || status[t.id] !== 'clue'} onClick={() => stage(t.id, 'countdown')}>2. Countdown and reveal</Btn>
                <Btn small variant="ghost" disabled={!['name', 'countdown'].includes(status[t.id])} onClick={() => stage(t.id, 'done')}>3. Finish</Btn>
                <Btn small variant="ghost" disabled={!status[t.id]} onClick={() => stage(t.id, null)}>Hide for team</Btn>
              </div>
            </div>
          ))}
          <div className="panel" style={{ borderColor: 'var(--accent, #a855f7)' }}>
            <h3 style={{ margin: '0 0 6px' }}>The finale</h3>
            <p className="hint" style={{ marginTop: 0 }}>
              Shows all four names on every phone and on the big screen at the same moment. {revealedCount} of 4 teams have seen their name.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {state.final ? (
                <Btn variant="ghost" onClick={() => flag('final', false)}>Hide the finale</Btn>
              ) : revealedCount < 4 ? (
                <ConfirmBtn disabled={!authorised} onConfirm={() => flag('final', true)}>Show all four names anyway</ConfirmBtn>
              ) : (
                <Btn disabled={!authorised} onClick={() => flag('final', true)}>Show all four names to everyone</Btn>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <ConfirmBtn variant="ghost" onConfirm={shuffle}>Shuffle which team gets which name</ConfirmBtn>
            <ConfirmBtn variant="ghost" onConfirm={() => dispatch({ type: 'revealReset' })}>Close all doors again</ConfirmBtn>
            <span className="hint" role="status">{saved}</span>
          </div>
        </div>
      )}
    </Panel>
  )
}
