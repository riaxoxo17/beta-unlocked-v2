import { RoomIcon } from '../../components/art.jsx'
import { useMission, useGame } from '../../lib/useGame.jsx'
import { Btn, Field, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'
import { DEFAULT_TARGET, LEVERS, TWISTS, leverTotal, planTotal, rupees, thrownTwists, toAmount } from '../../lib/ignition.js'

const MOVES = [1, 2, 3]

function Meter({ total, target }) {
  const pct = Math.max(0, Math.min(100, (total / target) * 100))
  const met = total >= target
  return (
    <div>
      <div style={{ height: 14, background: 'rgba(255,255,255,.1)', borderRadius: 8, overflow: 'hidden' }} role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.max(0, total)} aria-label="Plan against target">
        <div style={{ height: '100%', width: pct + '%', background: met ? 'var(--ok)' : 'var(--accent)', transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 14 }}>
        <span>
          Planned <b>{rupees(total)}</b>
        </span>
        <span className={met ? '' : 'muted'} style={met ? { color: 'var(--ok)' } : undefined}>
          {met ? 'Base plan covered' : `${rupees(target - total)} still to find`}
        </span>
      </div>
    </div>
  )
}

export default function Ignition() {
  const { p, set, players, me } = useMission('ignition')
  const { ev } = useGame()
  const target = ev.betaTarget || DEFAULT_TARGET
  const total = planTotal(p, target)
  const met = total >= target
  const locked = !!p.submitted
  const twists = thrownTwists(p)
  const nameOf = (id) => players.find((x) => x.id === id)?.name

  const missing = []
  if (!met) missing.push(`the plan is ${rupees(target - total)} short`)
  if (!(p.name || '').trim()) missing.push('a campaign name')
  if (!(p.tagline || '').trim()) missing.push('a tagline')
  if (MOVES.some((k) => !(p['move' + k] || '').trim())) missing.push('three first moves')
  useAutoStamp(locked, p.stamp, set)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>Your Betta has to raise {rupees(target)}</h3>
        <p style={{ margin: '0 0 12px' }}>
          Many of you have not worked together yet. Use these minutes to sit, talk and lay the foundation, so that when the campaign starts you can simply execute it.
        </p>
        <Meter total={total} target={target} />
      </Panel>

      <Panel>
        <div className="label">What each of us brings</div>
        <p className="hint" style={{ marginTop: 0 }}>One skill or contact you can put behind the campaign. Read what your teammates wrote before you choose who owns what.</p>
        {players.map((pl) => (
          <Field key={pl.id} label={pl.id === me.id ? 'You' : pl.name} htmlFor={'bring-' + pl.id}>
            <SharedField
              id={'bring-' + pl.id}
              value={p['bring:' + pl.id]}
              onCommit={(v) => set('bring:' + pl.id, v)}
              disabled={pl.id !== me.id}
              placeholder={pl.id === me.id ? 'For example: I know four HR managers' : 'Waiting for ' + pl.name}
            />
          </Field>
        ))}
      </Panel>

      <Panel>
        <div className="label">Where the money comes from</div>
        <p className="hint" style={{ marginTop: 0 }}>Give each source an owner and a realistic amount. Aim to cover the base plan with a little room to spare.</p>
        <div style={{ display: 'grid', gap: 14 }}>
          {LEVERS.map((l) => (
            <div key={l.id} style={{ display: 'grid', gap: 6, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
              <div>
                <b>{l.title}</b>
                <div className="hint">{l.hint}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                <select className="select" aria-label={`Owner for ${l.title}`} value={p['lev:' + l.id + ':owner'] || ''} onChange={(e) => set('lev:' + l.id + ':owner', e.target.value || null)}>
                  <option value="">Who owns this?</option>
                  {players.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.id === me.id ? 'Me' : pl.name}
                    </option>
                  ))}
                </select>
                <SharedField
                  id={'amt-' + l.id}
                  value={p['lev:' + l.id + ':amt']}
                  onCommit={(v) => set('lev:' + l.id + ':amt', String(v).replace(/\D/g, '').slice(0, 9) || null)}
                  placeholder="Amount in rupees"
                />
              </div>
              <SharedField id={'how-' + l.id} value={p['lev:' + l.id + ':how']} onCommit={(v) => set('lev:' + l.id + ':how', v)} placeholder="How exactly? One line." />
              {toAmount(p['lev:' + l.id + ':amt']) > 0 && <div className="hint">{rupees(toAmount(p['lev:' + l.id + ':amt']))}{p['lev:' + l.id + ':owner'] ? ` with ${nameOf(p['lev:' + l.id + ':owner']) || 'a teammate'}` : ''}</div>}
            </div>
          ))}
        </div>
        <p style={{ marginBottom: 0 }}>
          Sources add up to <b>{rupees(leverTotal(p))}</b>
          {total !== leverTotal(p) && (
            <>
              , and twists move the plan to <b>{rupees(total)}</b>
            </>
          )}
          .
        </p>
      </Panel>

      {twists.length > 0 && (
        <Panel style={{ borderColor: 'var(--accent)' }}>
          <div className="label">Twists from your facilitator</div>
          <div style={{ display: 'grid', gap: 14 }}>
            {twists.map((t) => (
              <div key={t.id}>
                <b>{t.title}</b>
                <p style={{ margin: '4px 0' }}>{t.text}</p>
                {t.pct !== 0 && <div className="hint">{t.pct > 0 ? '+' : '-'}{rupees(Math.abs(Math.round((target * t.pct) / 100)))} on your plan</div>}
                <Field label={t.ask} htmlFor={'twr-' + t.id}>
                  <SharedField id={'twr-' + t.id} value={p['twr:' + t.id]} onCommit={(v) => set('twr:' + t.id, v)} placeholder="Agree an answer as a team" />
                </Field>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <div className="label">The foundation you hand to your chapter</div>
        <Field label="Campaign name" htmlFor="ig-name">
          <SharedField id="ig-name" value={p.name} onCommit={(v) => set('name', v)} />
        </Field>
        <Field label="Tagline" htmlFor="ig-tag">
          <SharedField id="ig-tag" value={p.tagline} onCommit={(v) => set('tagline', v)} />
        </Field>
        {MOVES.map((k) => (
          <Field key={k} label={`First move ${k}`} hint={k === 1 ? 'The first three things you will do once the campaign opens.' : undefined} htmlFor={'ig-m' + k}>
            <SharedField id={'ig-m' + k} value={p['move' + k]} onCommit={(v) => set('move' + k, v)} />
          </Field>
        ))}
      </Panel>

      {locked ? (
        <Panel style={{ textAlign: 'center' }}>
          <RoomIcon room="ignition" size={52} />
          <h3>Foundation locked. Ignition Stamp earned.</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {p.name}: {p.tagline}
          </p>
          {!met && <p style={{ color: 'var(--bad)', marginBottom: 0 }}>A twist has left the plan {rupees(target - total)} short. Update your sources above.</p>}
        </Panel>
      ) : (
        <Panel>
          {missing.length > 0 && <p className="hint" style={{ marginTop: 0 }}>To lock the foundation you still need: {missing.join(', ')}.</p>}
          <Btn disabled={missing.length > 0} onClick={() => (sfx.stamp(), set('submitted', store.now()))}>
            Lock our foundation
          </Btn>
        </Panel>
      )}
    </div>
  )
}
