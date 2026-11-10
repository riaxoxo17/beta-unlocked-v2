import { TWISTS, rupees } from '../lib/ignition.js'
import { Btn } from './ui.jsx'
import { store } from '../lib/store/index.js'

// Facilitator and GM control: throw or withdraw a twist for one team. `put(key, value)` writes a team field for the Ignition Room.
export function TwistPanel({ p = {}, target, put }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {TWISTS.map((t) => {
        const on = !!p['tw:' + t.id]
        const impact = Math.round((target * t.pct) / 100)
        return (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <b>{t.title}</b>
              <div className="hint">{impact === 0 ? 'No change to the plan total' : `${impact > 0 ? '+' : '-'}${rupees(Math.abs(impact))} on the plan`}</div>
              {on && p['twr:' + t.id] && <div className="hint">Reply: {p['twr:' + t.id]}</div>}
            </div>
            <Btn small variant={on ? 'ghost' : undefined} onClick={() => put('tw:' + t.id, on ? null : store.now())}>
              {on ? 'Withdraw' : 'Throw it'}
            </Btn>
          </div>
        )
      })}
    </div>
  )
}
