import { useEffect, useState } from 'react'
import { useGame } from '../lib/useGame.jsx'
import { TEAMS } from '../lib/config.js'
import { nav } from '../lib/router.js'
import { DoorArt, RoomScene } from '../components/art.jsx'
import { Btn } from '../components/ui.jsx'

export default function Join() {
  const { join, me, state } = useGame()
  const [teamId, setTeamId] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const team = TEAMS.find((t) => t.id === teamId)

  // Someone who is already signed in goes straight back to the game.
  useEffect(() => {
    if (me) nav('/play')
  }, [me])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!team) return setError('Pick your team first.')
    if (!teamCode.trim()) return setError('Enter the team code your facilitator gave you.')
    if (name.trim().length < 2) return setError('Enter a name with at least 2 characters.')
    setJoining(true)
    try {
      await join(team.id, teamCode.trim(), name.trim())
      nav('/play')
    } catch (err) {
      setError(err.message || 'Could not join. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const count = (state.roster || []).length

  return (
    <div className="stage join" data-room="hq" style={team ? { '--accent': team.color, '--accent-ink': '#0b0b16' } : undefined}>
      <div className="join-hero">
        <RoomScene room="chaos" height={150} style={{ position: 'absolute', inset: 0, height: '100%', opacity: 0.35 }} />
        <div className="join-doors" aria-hidden="true">
          {TEAMS.map((t) => (
            <DoorArt key={t.id} color={t.color} number={t.door} open={teamId === t.id} width={64} />
          ))}
        </div>
        <h1 className="pixel join-title">Beta: Unlocked</h1>
        <p className="join-sub">Four doors. One of them is yours.</p>
      </div>

      <form className="join-card panel" onSubmit={submit} noValidate>
        <fieldset className="join-teams">
          <legend className="label">Your team</legend>
          <div role="radiogroup" aria-label="Your team">
            {TEAMS.map((t) => (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={teamId === t.id}
                className="team-pick"
                style={{ '--c': t.color }}
                onClick={() => {
                  setTeamId(t.id)
                  setError('')
                }}
              >
                <span className="dot" />
                <span>{t.name}</span>
                <small>{t.colorName}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="join-field">
          <label className="label" htmlFor="team-code">
            Team code
          </label>
          <input id="team-code" className="input" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="Ask your facilitator" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </div>
        <div className="join-field">
          <label className="label" htmlFor="player-name">
            Your name
          </label>
          <input id="player-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" maxLength={30} autoComplete="given-name" />
        </div>

        {error && (
          <p role="alert" className="join-error">
            {error}
          </p>
        )}
        <Btn type="submit" disabled={joining} className="join-go">
          {joining ? 'Joining…' : 'Join the game'}
        </Btn>
        <p className="hint" style={{ textAlign: 'center', margin: '12px 0 0' }}>
          Facilitator? <a href="#/facilitator">Sign in here</a>. Facilitators watch and guide, they do not play.
        </p>
        <p className="hint" style={{ textAlign: 'center', margin: '6px 0 0' }}>
          {count ? `${count} players are in.` : 'Rejoining? Use the same team and name.'}
        </p>
      </form>
    </div>
  )
}
