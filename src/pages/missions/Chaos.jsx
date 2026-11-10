import { Sprite, SPRITES, RoomIcon } from '../../components/art.jsx'
import { motion } from 'framer-motion'
import { useMission } from '../../lib/useGame.jsx'
import { ownerIndex } from '../../lib/game.js'
import { Btn, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'

const OBJECTS = [
  { id: 'sock', e: '🧦', n: 'Sock' },
  { id: 'mirror', e: '🪞', n: 'Mirror' },
  { id: 'onion', e: '🧅', n: 'Onion' },
  { id: 'toothbrush', e: '🪥', n: 'Toothbrush' },
  { id: 'bucket', e: '🪣', n: 'Bucket' },
  { id: 'duck', e: '🦆', n: 'Rubber duck' },
  { id: 'magnet', e: '🧲', n: 'Magnet' },
  { id: 'pizza', e: '🍕', n: 'Pizza' },
  { id: 'candle', e: '🕯️', n: 'Candle' },
  { id: 'kite', e: '🪁', n: 'Kite' },
  { id: 'trophy', e: '🏆', n: 'Trophy' },
  { id: 'rocket', e: '🚀', n: 'Rocket' }, 
  { id: 'pencil', e: '✏️', n: 'Pencil' },
  { id: 'book', e: '📖', n: 'Book' },
  { id: 'phone', e: '📱', n: 'Phone' },
  { id: 'hat', e: '🎩', n: 'Hat' },
  { id: 'glasses', e: '👓', n: 'Glasses' },
  { id: 'watch', e: '⌚', n: 'Watch' },
  { id: 'camera', e: '📷', n: 'Camera' },
  { id: 'headphones', e: '🎧', n: 'Headphones' },
  { id: 'laptop', e: '💻', n: 'Laptop' },
  { id: 'umbrella', e: '☂️', n: 'Umbrella' },
  { id: 'flashlight', e: '🔦', n: 'Flashlight' },
  { id: 'key', e: '🔑', n: 'Key' },
  { id: 'lock', e: '🔒', n: 'Lock' },
  { id: 'map', e: '🗺️', n: 'Map' },
  ]

const SECTIONS = [
  { key: 'name', label: 'What is the product called?', ph: 'The Reflecto-Onion 3000', rows: 1 },
  { key: 'problem', label: 'What problem does it solve?', ph: 'Nobody can find a safe place to store a sad onion.', rows: 2 },
  { key: 'buyer', label: 'Who would buy it?', ph: 'Anyone who has ever cried while cooking.', rows: 2 },
  { key: 'revolution', label: 'Why is it absolutely revolutionary?', ph: 'It is the first storage system that looks back at you.', rows: 2 },
  { key: 'ad', label: 'Your 30-second advertisement', ph: 'Write the script. Every teammate can shout a line.', rows: 4 },
]

const EXAMPLES = [
  'Onion + mirror + bucket: a self-reflecting onion storage system.',
  'Sock + magnet + kite: magnetic flying laundry.',
  'Pizza + toothbrush + candle: an emergency midnight dinner kit.',
]

export default function Chaos() {
  const { p, set, players, me, myIdx } = useMission('chaos')
  const picks = p.picks || []
  const locked = !!p.submitted
  const n = Math.max(players.length, 1)

  const ownerOf = (i) => p['claim:' + i] || players[ownerIndex(i, n)]?.id
  const nameOf = (id) => players.find((x) => x.id === id)?.name || 'a teammate'

  const missing = []
  if (picks.length < 3) missing.push('pick three objects')
  SECTIONS.forEach((s, i) => {
    if (!(p['sec:' + s.key] || '').trim()) missing.push(`${nameOf(ownerOf(i))} writes: ${s.label.toLowerCase()}`)
  })
  if (!(p.oneliner || '').trim()) missing.push('write the one-line pitch')

  useAutoStamp(!!p.submitted, p.stamp, set)

  const toggle = (id) => {
    if (locked) return
    if (picks.includes(id)) set('picks', picks.filter((x) => x !== id))
    else if (picks.length < 3) set('picks', [...picks, id])
  }

  if (!p.opened && !locked) {
    return (
      <Panel style={{ textAlign: 'center', padding: 36 }}>
        <motion.div animate={{ rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ fontSize: 72 }}>
          <Sprite rows={SPRITES.box} colors={{ a: '#e879f9' }} scale={9} />
        </motion.div>
        <h2 style={{ margin: '12px 0 8px' }}>The mystery box is humming</h2>
        <p className="muted" style={{ maxWidth: 440, margin: '0 auto 18px' }}>
          Your mission is inside. Open it when the whole team is ready, then the clock really starts.
        </p>
        <Btn onClick={() => (sfx.right(), set('opened', store.now()))}>Open the mystery box</Btn>
      </Panel>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>Invent something nobody needs but everybody will want</h3>
        <p style={{ margin: 0 }}>
          Pick any <b>three</b> objects and fuse them into one new product. Five minds, one ridiculous invention. Every teammate owns one part of the
          pitch, so nobody gets to just watch.
        </p>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Need a spark?</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {EXAMPLES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      </Panel>

      <Panel>
        <div className="label">Object board ({picks.length}/3 picked)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 12 }}>
          {OBJECTS.map((o) => (
            <button key={o.id} className="obj" aria-pressed={picks.includes(o.id)} onClick={() => toggle(o.id)} disabled={locked}>
              <span aria-hidden="true">{o.e}</span>
              <small>{o.n}</small>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="label">The pitch: one part each</div>
        {SECTIONS.map((s, i) => {
          const owner = ownerOf(i)
          const mine = owner === me.id
          return (
            <div key={s.key} style={{ marginBottom: 14 }}>
              <label className="label" htmlFor={'sec-' + s.key}>
                {i + 1}. {s.label}{' '}
                <span className="chip" style={{ marginLeft: 6 }}>
                  {mine ? 'Your part' : nameOf(owner)}
                </span>
              </label>
              <SharedField
                id={'sec-' + s.key}
                rows={s.rows}
                placeholder={mine ? s.ph : 'Waiting for ' + nameOf(owner)}
                value={p['sec:' + s.key]}
                onCommit={(v) => set('sec:' + s.key, v)}
                disabled={!mine || locked}
              />
              {!mine && !locked && owner && (
                <button className="hint" style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }} onClick={() => set('claim:' + i, me.id)}>
                  {nameOf(owner)} is away? Take this part over.
                </button>
              )}
            </div>
          )
        })}
        <label className="label" htmlFor="oneliner">
          Your one-line pitch (the Spokesperson reads this out)
        </label>
        <SharedField id="oneliner" value={p.oneliner} onCommit={(v) => set('oneliner', v)} placeholder="One line. Make it quotable." disabled={locked} />
      </Panel>

      {locked ? (
        <Panel style={{ textAlign: 'center' }}>
          <RoomIcon room="chaos" size={52} />
          <h3>Invention filed. Chaos Stamp earned.</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            “{p.oneliner}” · {p['sec:name']}
          </p>
        </Panel>
      ) : (
        <Panel>
          {missing.length > 0 && (
            <p className="hint" style={{ marginTop: 0 }}>
              Still needed: {missing.join('; ')}.
            </p>
          )}
          <Btn disabled={missing.length > 0} onClick={() => (sfx.stamp(), set('submitted', store.now()))}>
            Submit our invention
          </Btn>
        </Panel>
      )}
    </div>
  )
}
