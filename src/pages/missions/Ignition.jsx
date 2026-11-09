import { RoomIcon } from '../../components/art.jsx'
import { useEffect, useState } from 'react'
import { useMission } from '../../lib/useGame.jsx'
import { ownerIndex } from '../../lib/game.js'
import { Btn, Field, Panel, SharedField, useAutoStamp } from '../../components/ui.jsx'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'

const CARDS = [
  { title: 'The Budget Hawk', text: 'Make it achievable with zero budget.' },
  { title: 'The Volunteer Whisperer', text: 'Make it engaging for volunteers.' },
  { title: 'The Student Champion', text: 'Make it meaningful for students.' },
  { title: 'The Buzz Builder', text: 'Make it something people will talk about.' },
  { title: "The Devil's Advocate", text: 'Challenge the entire idea and improve it.' },
]
const FIELDS = ['name', 'purpose', 'act1', 'act2', 'act3', 'tagline', 'pitch']

export default function Ignition() {
  const { p, set, players, me } = useMission('ignition')
  const [peek, setPeek] = useState(false)
  const n = Math.max(players.length, 1)
  const locked = !!p.submitted
  const ownerOf = (i) => p['claim:' + i] || players[ownerIndex(i, n)]?.id
  const nameOf = (id) => players.find((x) => x.id === id)?.name || 'a teammate'
  const mine = CARDS.map((c, i) => ({ ...c, i })).filter((c) => ownerOf(c.i) === me.id)

  useEffect(() => {
    if (!peek) return
    const t = setTimeout(() => setPeek(false), 9000)
    return () => clearTimeout(t)
  }, [peek])

  const missing = []
  FIELDS.forEach((k) => !(p[k] || '').trim() && missing.push(k))
  CARDS.forEach((_, i) => !(p['lens:' + i] || '').trim() && missing.push('lens' + i))
  useAutoStamp(locked, p.stamp, set)

  const wordCount = (p.pitch || '').trim().split(/\s+/).filter(Boolean).length

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3 style={{ marginBottom: 6 }}>You have ₹10,000, five people and 24 hours</h3>
        <p style={{ margin: 0 }}>
          Create an initiative that gets your entire chapter talking. Each of you carries a secret responsibility, and the final campaign has to
          satisfy all five.
        </p>
      </Panel>

      <Panel>
        <div className="label">Your secret responsibility</div>
        {peek ? (
          mine.map((c) => (
            <div key={c.i} style={{ padding: 14, border: '2px solid var(--accent)', borderRadius: 12, marginBottom: 8, background: 'rgba(0,0,0,.3)' }}>
              <b>{c.title}</b>
              <div style={{ fontSize: 20, marginTop: 4 }}>{c.text}</div>
            </div>
          ))
        ) : (
          <Btn variant="ghost" onClick={() => setPeek(true)}>
            Reveal my card (hides again in 9 seconds)
          </Btn>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>
          Do not read it out. Let your teammates feel the pull of your lens in the way you shape the idea.
        </p>
      </Panel>

      <Panel>
        <div className="label">The campaign</div>
        <Field label="Campaign name" htmlFor="ig-name">
          <SharedField id="ig-name" value={p.name} onCommit={(v) => set('name', v)} disabled={locked} />
        </Field>
        <Field label="One-line purpose" htmlFor="ig-purpose">
          <SharedField id="ig-purpose" value={p.purpose} onCommit={(v) => set('purpose', v)} disabled={locked} />
        </Field>
        {[1, 2, 3].map((k) => (
          <Field key={k} label={`Activity ${k}`} htmlFor={'ig-a' + k}>
            <SharedField id={'ig-a' + k} value={p['act' + k]} onCommit={(v) => set('act' + k, v)} disabled={locked} />
          </Field>
        ))}
        <Field label="Tagline" htmlFor="ig-tag">
          <SharedField id="ig-tag" value={p.tagline} onCommit={(v) => set('tagline', v)} disabled={locked} />
        </Field>
        <Field label="30-second launch pitch" hint={`${wordCount} words. About 70 is a comfortable 30 seconds.`} htmlFor="ig-pitch">
          <SharedField id="ig-pitch" rows={5} value={p.pitch} onCommit={(v) => set('pitch', v)} disabled={locked} />
        </Field>
      </Panel>

      <Panel>
        <div className="label">Proof every lens is in the campaign</div>
        <p className="hint" style={{ marginTop: 0 }}>
          Whoever holds a card writes one line on how the campaign honours it.
        </p>
        {CARDS.map((c, i) => {
          const owner = ownerOf(i)
          const isMine = owner === me.id
          return (
            <Field key={i} label={isMine ? `Your card: ${c.title}` : `${c.title} (${nameOf(owner)})`} htmlFor={'lens-' + i}>
              <SharedField
                id={'lens-' + i}
                value={p['lens:' + i]}
                onCommit={(v) => set('lens:' + i, v)}
                disabled={!isMine || locked}
                placeholder={isMine ? 'How does our campaign honour this?' : 'Waiting for ' + nameOf(owner)}
              />
              {!isMine && !locked && (
                <button className="hint" style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }} onClick={() => set('claim:' + i, me.id)}>
                  {nameOf(owner)} is away? Take this card over.
                </button>
              )}
            </Field>
          )
        })}
      </Panel>

      {locked ? (
        <Panel style={{ textAlign: 'center' }}>
          <RoomIcon room="ignition" size={52} />
          <h3>Campaign launched. Ignition Stamp earned.</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {p.name}: {p.tagline}
          </p>
        </Panel>
      ) : (
        <Panel>
          {missing.length > 0 && <p className="hint" style={{ marginTop: 0 }}>Fill every campaign field and all five lens lines to launch.</p>}
          <Btn disabled={missing.length > 0} onClick={() => (sfx.stamp(), set('submitted', store.now()))}>
            Launch our campaign
          </Btn>
        </Panel>
      )}
    </div>
  )
}
