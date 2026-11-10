import { RoomIcon } from '../../components/art.jsx'
import { useMission, useGame } from '../../lib/useGame.jsx'
import { Btn, Field, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'
import { DEFAULT_TARGET, RATIOS, TWISTS, initiatives, newInitiativeId, planTotal, rupees, toAmount } from '../../lib/ignition.js'

function Meter({ total, target }) {
  const pct = Math.max(0, Math.min(100, (total / target) * 100))
  const met = total >= target
  return (
    <div>
      <div style={{ height: 14, background: 'rgba(255,255,255,.1)', borderRadius: 8, overflow: 'hidden' }} role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={total} aria-label="Plan against target">
        <div style={{ height: '100%', width: pct + '%', background: met ? 'var(--ok)' : 'var(--accent)', transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 14 }}>
        <span>
          Planned <b>{rupees(total)}</b>
        </span>
        <span className={met ? '' : 'muted'} style={met ? { color: 'var(--ok)' } : undefined}>
          {met ? 'Target covered' : `${rupees(target - total)} still to find`}
        </span>
      </div>
    </div>
  )
}

export default function Ignition() {
  const { p, set, players, me } = useMission('ignition')
  const { ev } = useGame()
  const target = ev.betaTarget || DEFAULT_TARGET
  const list = initiatives(p)
  const total = planTotal(p)
  const met = total >= target
  const locked = !!p.submitted
  const twists = TWISTS.filter((t) => p['tw:' + t.id])
  const nameOf = (id) => (id === me.id ? 'you' : players.find((x) => x.id === id)?.name || 'a teammate')

  const add = () => set(`ini:${newInitiativeId()}:t`, '')
  const remove = (id) => ['t', 'owner', 'amt'].forEach((f) => set(`ini:${id}:${f}`, null))

  const missing = []
  if (list.filter((i) => i.title.trim()).length < 3) missing.push('at least three initiatives')
  if (list.some((i) => i.title.trim() && !i.owner)) missing.push('an accountable owner for every initiative')
  if (!met) missing.push(`${rupees(target - total)} more in the plan`)
  if (!(p.name || '').trim()) missing.push('a campaign name')
  if (!(p.tagline || '').trim()) missing.push('a tagline')
  useAutoStamp(locked, p.stamp, set)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>Your Betta has to raise {rupees(target)}</h3>
        <p style={{ margin: '0 0 12px' }}>
          Each of you leads a centre, and together you carry this target. Sit down, talk, and decide how your Beta will get there. Nobody is handing you the ideas. Add the initiatives you believe in and
          choose who is accountable for each, so that when the campaign opens you can simply execute.
        </p>
        <Meter total={total} target={target} />
      </Panel>

      <Panel>
        <div className="label">Our initiatives</div>
        {list.length === 0 && <p className="hint" style={{ marginTop: 0 }}>Nothing here yet. Start with the first idea someone in your team believes in.</p>}
        <div style={{ display: 'grid', gap: 14 }}>
          {list.map((i) => (
            <div key={i.id} style={{ display: 'grid', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              <SharedField id={'ini-t-' + i.id} value={p[`ini:${i.id}:t`]} onCommit={(v) => set(`ini:${i.id}:t`, v)} placeholder="The initiative, for example a social media campaign" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, alignItems: 'center' }}>
                <select className="select" aria-label="Who is accountable" value={i.owner} onChange={(e) => set(`ini:${i.id}:owner`, e.target.value || null)}>
                  <option value="">Who is accountable?</option>
                  {players.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.id === me.id ? 'Me' : pl.name}
                    </option>
                  ))}
                </select>
                <SharedField
                  id={'ini-a-' + i.id}
                  value={p[`ini:${i.id}:amt`]}
                  onCommit={(v) => set(`ini:${i.id}:amt`, String(v).replace(/\D/g, '').slice(0, 9) || null)}
                  placeholder="Expected rupees"
                />
                <button className="hint" style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }} onClick={() => remove(i.id)}>
                  Remove
                </button>
              </div>
              {i.amt > 0 && <div className="hint">{rupees(i.amt)}{i.owner ? `, owned by ${nameOf(i.owner)}` : ''}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn variant="ghost" onClick={add}>
            Add an initiative
          </Btn>
        </div>
      </Panel>

      {twists.map((t) => (
        <Panel key={t.id} style={{ borderColor: 'var(--accent)' }}>
          <div className="label">A moment for your team</div>
          <h3 style={{ marginBottom: 4 }}>{t.title}</h3>
          <p style={{ margin: '0 0 10px' }}>{t.text}</p>
          {t.ratio && (
            <div style={{ marginBottom: 12 }}>
              <div className="hint" style={{ marginBottom: 6 }}>Agree on the split together</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RATIOS.map((r) => (
                  <Btn key={r} small variant={Number(p.ratio) === r ? undefined : 'ghost'} onClick={() => set('ratio', r)} aria-pressed={Number(p.ratio) === r}>
                    Centres {r} / Beta {100 - r}
                  </Btn>
                ))}
              </div>
            </div>
          )}
          <Field label={t.ask} htmlFor={'twr-' + t.id}>
            <SharedField id={'twr-' + t.id} rows={3} value={p['twr:' + t.id]} onCommit={(v) => set('twr:' + t.id, v)} placeholder="Agree an answer as a team" />
          </Field>
        </Panel>
      ))}

      <Panel>
        <div className="label">Name your Betta's campaign</div>
        <Field label="Campaign name" htmlFor="ig-name">
          <SharedField id="ig-name" value={p.name} onCommit={(v) => set('name', v)} />
        </Field>
        <Field label="Tagline" htmlFor="ig-tag">
          <SharedField id="ig-tag" value={p.tagline} onCommit={(v) => set('tagline', v)} />
        </Field>
      </Panel>

      {locked ? (
        <Panel style={{ textAlign: 'center' }}>
          <RoomIcon room="ignition" size={52} />
          <h3>Plan locked. Ignition Stamp earned.</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {p.name}: {p.tagline}
          </p>
        </Panel>
      ) : (
        <Panel>
          {missing.length > 0 && <p className="hint" style={{ marginTop: 0 }}>To lock your plan you still need: {missing.join(', ')}.</p>}
          <Btn disabled={missing.length > 0} onClick={() => (sfx.stamp(), set('submitted', store.now()))}>
            Lock our plan
          </Btn>
        </Panel>
      )}
    </div>
  )
}
