import { RoomIcon } from '../../components/art.jsx'
import { useEffect, useState } from 'react'
import { useMission } from '../../lib/useGame.jsx'
import { TEAMS, ROOMS } from '../../lib/config.js'
import { roomFor, teamIndex } from '../../lib/game.js'
import { Btn, Field, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'

const TRAITS = [
  { id: 'food', label: 'The same favourite food' },
  { id: 'weekend', label: 'The same type of weekend personality' },
  { id: 'habit', label: 'A similar unusual habit' },
]

// The broker holds whatever piece each team is missing. The Game Master (or auto-release) hands it over.
export const BROKER = [
  { have: ['Location', 'the Old Clock Tower'], need: ['Time', '6:45 PM'] },
  { have: ['Time', '6:45 PM'], need: ['Theme', 'Retro Superheroes'] },
  { have: ['Theme', 'Retro Superheroes'], need: ['Codeword', 'FIREFLY'] },
  { have: ['Codeword', 'FIREFLY'], need: ['Location', 'the Old Clock Tower'] },
]

const SCENARIOS = [
  {
    title: 'Stranded on an island',
    text: 'You can take only three things with you.',
    items: ['A phone with 1% battery', 'A suitcase full of money', 'A box of food', 'A first-aid kit', 'A laptop with no internet'],
  },
  {
    title: 'Ten minutes before the session',
    text: 'Half your volunteers cancelled, the projector is dead and thirty students are walking in. Choose your three moves.',
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
  const idx = teamIndex(teamId)
  const broker = BROKER[idx]

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
  const c2 = !!p['c2:received'] && (p['c2:deal'] || '').trim().length > 0
  const c3 = settled.every(Boolean)
  useAutoStamp(c1 && c2 && c3, p.stamp, set)

  const rosterOthers = (state.roster || Object.values(state.players)).filter((pl) => pl.team !== teamId)
  const stepRound = state.event.step
  const whereIs = (team) => {
    const s = state.event.step
    const info = [1, 3, 5, 7].indexOf(s)
    return info >= 0 ? ROOMS[roomFor(team, info + 1)].short : 'between rooms'
  }

  const offer = () => {
    sfx.right()
    set('c2:offerAt', store.now())
    if (state.event.autoBroker) set('c2:received', broker.need[1])
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>The human connection quest</h3>
        <p style={{ margin: '0 0 12px' }}>Three challenges. Every voice in the team gets used.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="tablist">
          {[
            [1, 'Find your match', c1],
            [2, 'The negotiation', c2],
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
        <Panel>
          <p style={{ marginTop: 0 }}>
            Your team holds one piece of a plan. The <b>Broker</b> holds the one you are missing. Make an offer worth trading for.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0' }}>
            <div className="panel">
              <div className="hint">We have</div>
              <b>{broker.have[0]}:</b> {broker.have[1]}
            </div>
            <div className="panel">
              <div className="hint">We need</div>
              <b>{broker.need[0]}</b>
              {p['c2:received'] && <span>: {p['c2:received']}</span>}
            </div>
          </div>
          {!p['c2:received'] && (
            <>
              <Field label="Your offer to the Broker" htmlFor="offer" hint="The Spokesperson makes the pitch out loud. Write the deal you are offering here.">
                <SharedField id="offer" rows={3} value={p['c2:offer']} onCommit={(v) => set('c2:offer', v)} disabled={!!p['c2:offerAt']} />
              </Field>
              <Btn disabled={!!p['c2:offerAt'] || !(p['c2:offer'] || '').trim()} onClick={offer}>
                Send offer
              </Btn>
              {p['c2:offerAt'] && <p className="hint">Offer sent. The Broker is thinking it over.</p>}
            </>
          )}
          {p['c2:received'] && (
            <Field label="Close the deal: what did you give and what did you get?" htmlFor="deal">
              <SharedField id="deal" rows={2} value={p['c2:deal']} onCommit={(v) => set('c2:deal', v)} />
            </Field>
          )}
        </Panel>
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
