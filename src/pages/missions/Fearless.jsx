import { RoomIcon } from '../../components/art.jsx'
import { useEffect, useState } from 'react'
import { useMission } from '../../lib/useGame.jsx'
import { TEAMS, ROOMS } from '../../lib/config.js'
import { roomFor } from '../../lib/game.js'
import { Btn, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'

const TRAITS = [
  { id: 'food', label: 'The same favourite food' },
  { id: 'weekend', label: 'The same type of weekend personality' },
  { id: 'habit', label: 'A similar unusual habit' },
]

// Courage dares. Each player dares the next teammate in the ring, who does it out loud.
export const DARES = [
  'Tell the team about a mistake you made as a volunteer and what it taught you. 60 seconds.',
  'Admit one thing about running your chapter that you are unsure about, then ask the team for an idea.',
  'Give every teammate one specific compliment, out loud, with no jokes.',
  'Say what you are most nervous about this year and what would help.',
  'Teach the team one thing you are good at in 60 seconds.',
  'Describe a moment you were proud of yourself that you never told anyone about.',
]

const SCENARIOS = [
  {
    title: 'Stranded on an island',
    text: 'You can take only three things with you.',
    items: ['A phone with 1% battery', 'A suitcase full of money', 'A box of food', 'A first-aid kit', 'A laptop with no internet'],
  },
  {
    title: 'Ten minutes before the class starts',
    text: 'Half of the volunteers cancelled and thirty students are walking in. Choose your three moves.',
    items: ['Merge the groups and run a story circle', 'Call the backup volunteer list', 'Take the session outside', 'Cancel and reschedule', 'Ask older students to co-lead'],
  },
  {
    title: 'One year, three bets',
    text: 'Your chapter can only invest in three of these this year.',
    items: ['One big annual event', 'Volunteer training', 'Student mentoring pairs', 'A loud social media push', 'Branded merchandise'],
  },
]

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export default function Fearless() {
  const { p, set, players, me, teamId, state } = useMission('fearless')
  const [tab, setTab] = useState(1)

  // A scenario is settled when every teammate has chosen three items and all choices match.
  const unanimous = (s) => {
    const votes = players.map((pl) => p[`c3:${s}:vote:${pl.id}`] || [])
    return votes.length > 0 && votes.every((v) => v.length === 3 && sameSet(v, votes[0]))
  }
  const settled = SCENARIOS.map((_, s) => unanimous(s))

  useEffect(() => {
    settled.forEach((ok, s) => {
      if (ok && !p[`c3:${s}:done`]) set(`c3:${s}:done`, store.now())
      if (!ok && p[`c3:${s}:done`]) set(`c3:${s}:done`, null)
    })
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const c1 = TRAITS.every((t) => (p[`c1:${t.id}:who`] || '').trim() && (p[`c1:${t.id}:what`] || '').trim())
  // Dare Ring: player i dares player i+1. Done when every dare is chosen and confirmed by the one who set it.
  const ring = players.map((pl, i) => ({ giver: pl, target: players[(i + 1) % players.length] }))
  const c2 = ring.length > 0 && ring.every((r) => p[`c2:${r.giver.id}:dare`] && p[`c2:${r.giver.id}:done`])
  const c3 = settled.every(Boolean)
  useAutoStamp(c1 && c2 && c3, p.stamp, set)

  const rosterOthers = (state.roster || Object.values(state.players)).filter((pl) => pl.team !== teamId)
  const stepRound = state.event.step
  const whereIs = (team) => {
    const s = state.event.step
    const info = [1, 3, 5, 7].indexOf(s)
    return info >= 0 ? ROOMS[roomFor(team, info + 1)].short : 'between rooms'
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>The human connection quest</h3>
        <p style={{ margin: '0 0 12px' }}>Three challenges. Every voice in the team gets used.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="tablist">
          {[
            [1, 'Find your match', c1],
            [2, 'The dare ring', c2],
            [3, 'The impossible choice', c3],
          ].map(([n, l, ok]) => (
            <Btn key={n} small variant={tab === n ? 'primary' : 'ghost'} onClick={() => setTab(n)} role="tab" aria-selected={tab === n}>
              {ok ? '✓' : n}. {l}
            </Btn>
          ))}
        </div>
      </Panel>

      {tab === 1 && (
        <Panel>
          <p style={{ marginTop: 0 }}>
            Find someone from <b>another team</b> and discover three things you have in common. Use Gather chat or a quick call, then log each match.
          </p>
          {TRAITS.map((t) => (
            <div key={t.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
              <div className="label">{t.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <SharedField value={p[`c1:${t.id}:who`]} onCommit={(v) => set(`c1:${t.id}:who`, v)} placeholder="Their name" />
                <SharedField value={p[`c1:${t.id}:what`]} onCommit={(v) => set(`c1:${t.id}:what`, v)} placeholder="What you share" />
              </div>
            </div>
          ))}
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Who is out there ({rosterOthers.length})</summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {rosterOthers.length === 0 && <span className="hint">Nobody from other teams has joined yet.</span>}
              {rosterOthers.map((pl) => {
                const t = TEAMS.find((x) => x.id === pl.team)
                return (
                  <div key={pl.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="dot" style={{ '--c': t.color }} />
                    <b>{pl.name}</b>
                    <span className="hint">{t.name}, {whereIs(pl.team)}</span>
                  </div>
                )
              })}
            </div>
          </details>
        </Panel>
      )}

      {tab === 2 && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Panel>
            <p style={{ margin: 0 }}>
              Sit in a circle. Each of you picks a dare for the teammate <b>after</b> you. They do it out loud, and you confirm it was real. Fearless is saying it anyway.
            </p>
          </Panel>
          {ring.map(({ giver, target }) => {
            const dare = p[`c2:${giver.id}:dare`]
            const done = p[`c2:${giver.id}:done`]
            const iAmGiver = giver.id === me.id
            const self = giver.id === target.id
            return (
              <Panel key={giver.id}>
                <h3 style={{ fontSize: 18 }}>
                  {done ? '✓ ' : ''}
                  {iAmGiver ? 'You dare ' : giver.name + ' dares '}
                  {self ? 'themselves' : target.id === me.id ? 'you' : target.name}
                </h3>
                {!dare && !iAmGiver && <p className="hint">Waiting for {giver.name} to choose a dare.</p>}
                {!dare && iAmGiver && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {DARES.map((d) => (
                      <button key={d} className="pick" aria-pressed={false} onClick={() => { sfx.click?.(); set(`c2:${giver.id}:dare`, d) }}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {dare && <p style={{ fontWeight: 600 }}>{dare}</p>}
                {dare && !done && iAmGiver && (
                  <Btn onClick={() => { sfx.right(); set(`c2:${giver.id}:done`, store.now()) }}>
                    {self ? 'I did it' : `${target.name} did it`}
                  </Btn>
                )}
                {dare && !done && !iAmGiver && <p className="hint">{giver.name} confirms once {self ? 'it is' : target.id === me.id ? 'you have' : target.name + ' has'} done it.</p>}
                {done && <p style={{ margin: 0, fontWeight: 600, color: 'var(--ok)' }}>Done.</p>}
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 3 && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Panel>
            <p style={{ margin: 0 }}>
              Each of you chooses <b>three</b> items and defends them. Then negotiate until the whole team lands on the same three.
            </p>
          </Panel>
          {SCENARIOS.map((sc, s) => {
            const mine = p[`c3:${s}:vote:${me.id}`] || []
            const toggle = (item) => {
              const next = mine.includes(item) ? mine.filter((x) => x !== item) : mine.length < 3 ? [...mine, item] : mine
              set(`c3:${s}:vote:${me.id}`, next)
            }
            return (
              <Panel key={s}>
                <h3 style={{ fontSize: 18 }}>
                  {settled[s] ? '✓ ' : ''}
                  {sc.title}
                </h3>
                <p>{sc.text}</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {sc.items.map((it) => (
                    <button key={it} className="pick" aria-pressed={mine.includes(it)} onClick={() => toggle(it)}>
                      {it}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="label" htmlFor={'why-' + s}>
                    Why these three? ({mine.length}/3 chosen)
                  </label>
                  <SharedField id={'why-' + s} value={p[`c3:${s}:why:${me.id}`]} onCommit={(v) => set(`c3:${s}:why:${me.id}`, v)} placeholder="Defend your choice" />
                </div>
                <div style={{ marginTop: 12 }}>
                  {players.map((pl) => {
                    const v = p[`c3:${s}:vote:${pl.id}`] || []
                    return (
                      <div key={pl.id} className="hint" style={{ marginBottom: 2 }}>
                        <b>{pl.id === me.id ? 'You' : pl.name}</b>: {v.length ? v.join(' · ') : 'not chosen yet'}
                      </div>
                    )
                  })}
                  <p style={{ marginBottom: 0, fontWeight: 600, color: settled[s] ? 'var(--ok)' : 'var(--muted)' }}>
                    {settled[s] ? 'Unanimous. Decision locked.' : 'Not unanimous yet.'}
                  </p>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      {p.stamp && (
        <Panel style={{ textAlign: 'center' }}>
          <RoomIcon room="fearless" size={52} />
          <h3>Quest complete. Fearless Stamp earned.</h3>
        </Panel>
      )}
    </div>
  )
}
