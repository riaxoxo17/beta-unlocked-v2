import { useGame } from '../lib/useGame.jsx'
import { ROOMS, ROOM_ORDER } from '../lib/config.js'
import { teamById } from '../lib/game.js'
import { Stamp } from './ui.jsx'
import { Avatar } from './art.jsx'

export default function Passport() {
  const { state, teamId, me } = useGame()
  const team = teamById(teamId)
  const progress = state.teams[teamId].progress
  const stamps = ROOM_ORDER.filter((r) => progress[r]?.stamp)
  const payload = state.revealed?.[teamId]
  const revealed = !!payload

  return (
    <div className="passport" style={{ '--team': team.color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="pixel" style={{ fontSize: 22, fontWeight: 700 }}>
            Beta: Unlocked
          </div>
          <div className="hint">Player passport. Identity sealed until the vault.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
            <b>{me.name}</b>
            <Avatar name={me.name} color={team.color} size={44} />
          </div>
          <span className="chip" style={{ '--c': team.color, marginTop: 6 }}>
            <span className="dot" /> {team.name}
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 12, justifyItems: 'center', margin: '22px 0' }}>
        {ROOM_ORDER.map((r) => (
          <Stamp key={r} room={ROOMS[r]} earned={!!progress[r]?.stamp} color={team.color} />
        ))}
      </div>
      <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 14 }}>
        <div className="hint">Final identity</div>
        <div className="pixel" style={{ fontSize: 34, fontWeight: 700, color: revealed ? team.color : 'var(--muted)' }}>
          {revealed && payload?.name ? payload.name : '???'}
        </div>
        <div className="hint">
          {revealed ? payload?.tagline : stamps.length === 4 ? 'All four stamps collected. Head to the vault.' : `${stamps.length} of 4 stamps. Collect them all to discover your Beta.`}
        </div>
      </div>
    </div>
  )
}
