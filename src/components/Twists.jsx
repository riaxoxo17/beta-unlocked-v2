import { TWISTS } from '../lib/ignition.js'
import { Btn } from './ui.jsx'
import { store } from '../lib/store/index.js'

// Facilitator and GM control: bring a moment to a team or take it away. `put(key, value)` writes a team field for the Ignition Room.
export function TwistPanel({ p = {}, put }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {TWISTS.map((t) => {
        const on = !!p['tw:' + t.id]
        return (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <b>{t.title}</b>
              {t.ratio && p.ratio ? <div className="hint">Their split: centres {p.ratio}, Beta {100 - p.ratio}</div> : null}
              {on && p['twr:' + t.id] && <div className="hint">Their answer: {p['twr:' + t.id]}</div>}
            </div>
            <Btn small variant={on ? 'ghost' : undefined} onClick={() => put('tw:' + t.id, on ? null : store.now())}>
              {on ? 'Withdraw' : 'Bring it in'}
            </Btn>
          </div>
        )
      })}
    </div>
  )
}
