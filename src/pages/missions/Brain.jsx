import { createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'
import { useMission } from '../../lib/useGame.jsx'
import { check } from '../../lib/check.js'
import { Btn, Panel } from '../../components/ui.jsx'
import { useNow } from '../../lib/time.js'
import { store } from '../../lib/store/index.js'
import { sfx } from '../../lib/audio.js'

const NextCtx = createContext(null)
const DIGITS = [4, 2, 8, 5, 4]
const STATIONS = [
  { n: 1, icon: '🔎', title: 'The Observation Desk' },
  { n: 2, icon: '🔐', title: 'The Locked Locker' },
  { n: 3, icon: '📚', title: 'The Forgotten Library' },
  { n: 4, icon: '🖥️', title: 'The Code Terminal' },
  { n: 5, icon: '🧩', title: 'The Final Decryption' },
]
const WINDOW_MS = 20000
const MAX_VIEWS = 2

function Clock3() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-label="Clock showing 3:00">
      <circle cx="24" cy="24" r="21" fill="#f5f0e1" stroke="#222" strokeWidth="3" />
      <line x1="24" y1="24" x2="24" y2="9" stroke="#222" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="24" x2="35" y2="24" stroke="#222" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.5" fill="#222" />
    </svg>
  )
}
function Cup() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-label="Blue cup">
      <path d="M9 12h26v22a8 8 0 0 1-8 8H17a8 8 0 0 1-8-8z" fill="#2563eb" />
      <path d="M35 17h4a5 5 0 0 1 0 12h-4" fill="none" stroke="#2563eb" strokeWidth="4" />
      <rect x="9" y="12" width="26" height="5" fill="#60a5fa" />
    </svg>
  )
}
const SCENE = [
  { id: 'book', n: 'Red book', node: '📕' },
  { id: 'cup', n: 'Blue cup', node: <Cup /> },
  { id: 'star', n: 'Yellow star', node: '⭐' },
  { id: 'clock', n: 'Clock', node: <Clock3 /> },
  { id: 'key', n: 'Key', node: '🔑' },
  { id: 'pencil', n: 'Pencil', node: '✏️' },
  { id: 'plant', n: 'Green plant', node: '🪴' },
  { id: 'photo', n: 'Photograph', node: '🖼️' },
]

const QUESTIONS = [
  { id: 'cup', key: 'b1.cup', q: 'What colour was the cup?', opts: [['red', 'Red'], ['blue', 'Blue'], ['yellow', 'Yellow'], ['green', 'Green']] },
  { id: 'books', key: 'b1.books', q: 'How many books were there?', opts: [['0', 'None'], ['1', 'One'], ['2', 'Two'], ['3', 'Three']] },
  { id: 'clock', key: 'b1.clock', q: 'What time did the clock show?', opts: [['12:00', '12:00'], ['3:00', '3:00'], ['6:00', '6:00'], ['9:00', '9:00']] },
  { id: 'keylock', key: 'b1.keylock', q: 'Was there a key or a lock?', opts: [['key', 'A key'], ['lock', 'A lock']] },
  { id: 'next', key: 'b1.next', q: 'What was next to the photograph?', opts: SCENE.filter((s) => s.id !== 'photo').map((s) => [s.id, s.n]) },
]

const BOOKS = [
  { id: 'beginning', t: 'The Art of Beginning' },
  { id: 'last-chapter', t: 'The Last Chapter' },
  { id: 'missing-piece', t: 'The Missing Piece' },
  { id: 'ordinary', t: 'Beyond the Ordinary' },
  { id: 'hidden-truth', t: 'The Hidden Truth' },
]

export default function Brain() {
  const { p, set } = useMission('brain')
  const [sel, setSel] = useState(null)
  const [shake, setShake] = useState(0)
  const now = useNow(250)
  const solved = (n) => !!p['s' + n]
  const active = [1, 2, 3, 4, 5].find((n) => !solved(n)) || 5
  const view = Math.min(sel ?? active, active)

  const fail = (n) => {
    sfx.wrong()
    setShake((x) => x + 1)
    set('w' + n, (p['w' + n] || 0) + 1)
  }
  const pass = (n) => {
    sfx.right()
    set('s' + n, store.now())
    setSel(n) // stay on the station so the unlocked digit is seen
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <h3>The case of the missing identity</h3>
        <p style={{ margin: '6px 0 12px' }}>Five stations, five digits. Crack them in order, then open the case file.</p>
        <div style={{ display: 'flex', gap: 8 }} aria-label="Collected digits">
          {DIGITS.map((d, i) => (
            <div key={i} className={`digit ${solved(i + 1) ? 'on' : ''}`}>
              {solved(i + 1) ? d : '?'}
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="tablist">
        {STATIONS.map((s) => (
          <Btn key={s.n} small variant={view === s.n ? 'primary' : 'ghost'} disabled={s.n > active} onClick={() => setSel(s.n)} role="tab" aria-selected={view === s.n}>
            {solved(s.n) ? '✓' : s.icon} {s.n}
          </Btn>
        ))}
      </div>

      <NextCtx.Provider value={() => setSel(null)}>
      <Panel key={shake} className={shake ? 'shake' : ''}>
        <h3 style={{ marginBottom: 12 }}>
          Station {view}: {STATIONS[view - 1].title}
        </h3>
        {view === 1 && <Station1 p={p} set={set} now={now} done={solved(1)} onPass={() => pass(1)} />}
        {view === 2 && <Station2 done={solved(2)} onPass={() => pass(2)} onFail={() => fail(2)} wrong={p.w2 || 0} />}
        {view === 3 && <Station3 done={solved(3)} onPass={() => pass(3)} onFail={() => fail(3)} wrong={p.w3 || 0} />}
        {view === 4 && <Station4 done={solved(4)} onPass={() => pass(4)} onFail={() => fail(4)} />}
        {view === 5 && <Station5 p={p} set={set} done={solved(5)} onPass={() => pass(5)} onFail={() => fail(5)} />}
      </Panel>
      </NextCtx.Provider>
    </div>
  )
}

function Reward({ n }) {
  const next = useContext(NextCtx)
  return (
    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="terminal" style={{ marginTop: 12 }}>
      ACCESS GRANTED. Digit {n} of 5: <b style={{ fontSize: 22 }}>{DIGITS[n - 1]}</b>
      {n < 5 && (
        <div style={{ marginTop: 10 }}>
          <Btn small onClick={next}>Next station</Btn>
        </div>
      )}
    </motion.div>
  )
}

function Station1({ p, set, now, done, onPass }) {
  const views = p.s1views || 0
  const shownAt = p.s1shownAt || 0
  const visible = now - shownAt < WINDOW_MS && shownAt > 0
  const [result, setResult] = useState(null)
  const start = () => {
    set('s1views', views + 1)
    set('s1shownAt', store.now())
  }
  const submit = () => {
    const right = QUESTIONS.filter((q) => check(q.key, p['a:' + q.id])).length
    setResult(right)
    if (right === QUESTIONS.length) onPass()
    else sfx.wrong()
  }
  return (
    <div>
      <p style={{ marginTop: 0 }}>
        Study the desk for 20 seconds. Once it goes dark, answer all five questions from memory. You can look {MAX_VIEWS} times, and your whole team sees
        the same view at the same time.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
        {SCENE.map((s) => (
          <div key={s.id} className="scene-item">
            <div>
              {visible ? s.node : <span style={{ opacity: 0.25 }}>▒</span>}
              <small>{visible ? s.n : ''}</small>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 4, marginBottom: 12 }}>
        <div style={{ height: '100%', width: visible ? `${100 - ((now - shownAt) / WINDOW_MS) * 100}%` : 0, background: 'var(--accent)', borderRadius: 4 }} />
      </div>
      {!done && (
        <Btn variant="ghost" onClick={start} disabled={visible || views >= MAX_VIEWS}>
          {views >= MAX_VIEWS ? 'No views left' : views ? `Look again (${MAX_VIEWS - views} left)` : 'Start the 20 second look'}
        </Btn>
      )}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {QUESTIONS.map((q) => (
          <div key={q.id}>
            <label className="label" htmlFor={'q-' + q.id}>
              {q.q}
            </label>
            <select id={'q-' + q.id} className="select" disabled={done} value={p['a:' + q.id] || ''} onChange={(e) => set('a:' + q.id, e.target.value)}>
              <option value="">Choose…</option>
              {q.opts.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {!done && (
        <div style={{ marginTop: 14 }}>
          <Btn onClick={submit}>Check all five</Btn>
          {result !== null && result < 5 && <span style={{ marginLeft: 12 }}>{result} of 5 correct. Discuss and adjust.</span>}
        </div>
      )}
      {done && <Reward n={1} />}
    </div>
  )
}

function Station2({ done, onPass, onFail, wrong }) {
  const [msg, setMsg] = useState('')
  const pick = (n) => {
    if (done) return
    if (check('b2.locker', n)) onPass()
    else {
      setMsg(`Locker ${n} rattles but stays shut.`)
      onFail()
    }
  }
  return (
    <div>
      <div className="terminal">
        THE LOCKER RIDDLE
        <br />
        <br />I am an odd number.
        <br />
        Remove one letter from my name and I become even.
        <br />
        What number am I?
      </div>
      <p className="hint">Three odd-numbered lockers. Open the one that matches the riddle.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 420 }}>
        {[3, 7, 9].map((n) => (
          <button key={n} className="locker" onClick={() => pick(n)} aria-label={`Locker ${n}`}>
            {n}
          </button>
        ))}
      </div>
      {msg && !done && <p style={{ color: 'var(--bad)' }}>{msg} ({wrong} wrong so far)</p>}
      {done && <Reward n={2} />}
    </div>
  )
}

function Station3({ done, onPass, onFail, wrong }) {
  const [msg, setMsg] = useState('')
  const pick = (b) => {
    if (done) return
    if (check('b3.book', b.id)) onPass()
    else {
      setMsg(`“${b.t}” is just a book. Nothing falls out.`)
      onFail()
    }
  }
  return (
    <div>
      <div className="terminal">I am not the first, nor the last. I am what completes the whole. Find me.</div>
      <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
        {BOOKS.map((b) => (
          <button key={b.id} className="pick" onClick={() => pick(b)}>
            📘 {b.t}
          </button>
        ))}
      </div>
      {msg && !done && <p style={{ color: 'var(--bad)' }}>{msg} ({wrong} wrong so far)</p>}
      {done && <Reward n={3} />}
    </div>
  )
}

const shiftBack = (text, k) =>
  text.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 - k + 26) % 26) + 65))

function Station4({ done, onPass, onFail }) {
  const [val, setVal] = useState('')
  const [k, setK] = useState(0)
  const submit = (e) => {
    e.preventDefault()
    check('b4.code', val) ? onPass() : onFail()
  }
  return (
    <div>
      <div className="terminal">
        &gt; DECODE THIS MESSAGE
        <br />
        &gt; <b style={{ fontSize: 24, letterSpacing: 4 }}>ORFN</b>
        <br />
        &gt; HINT: every letter has been moved 3 positions forward in the alphabet.
      </div>
      <div style={{ margin: '14px 0' }}>
        <label className="label" htmlFor="shift">
          Decoder dial: shift back by {k}
        </label>
        <input id="shift" type="range" min="0" max="25" value={k} onChange={(e) => setK(+e.target.value)} style={{ width: '100%' }} />
        <div className="terminal" style={{ marginTop: 8, fontSize: 22, letterSpacing: 4 }}>
          {shiftBack('ORFN', k)}
        </div>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type the decoded word" aria-label="Decoded word" disabled={done} />
        <Btn disabled={done || !val}>Enter</Btn>
      </form>
      {done && <Reward n={4} />}
    </div>
  )
}

function Station5({ p, set, done, onPass, onFail }) {
  const [val, setVal] = useState('')
  const [code, setCode] = useState('')
  const submit = (e) => {
    e.preventDefault()
    check('b5.seq', val) ? onPass() : onFail()
  }
  const open = (e) => {
    e.preventDefault()
    if (check('b6.final', code)) {
      sfx.stamp()
      set('final', store.now())
      set('stamp', store.now())
    } else sfx.wrong()
  }
  return (
    <div>
      <div className="terminal" style={{ fontSize: 22 }}>
        What comes next?
        <br />2, 4, 8, 16, 32, <b>?</b>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <input className="input" value={val} onChange={(e) => setVal(e.target.value)} inputMode="numeric" placeholder="Next number" aria-label="Next number" disabled={done} />
        <Btn disabled={done || !val}>Enter</Btn>
      </form>
      {done && (
        <>
          <Reward n={5} />
          <p style={{ marginTop: 16 }}>
            You have all five digits. Enter them in order to open the case file.
          </p>
          <form onSubmit={open} style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={5} placeholder="5-digit code" aria-label="Five digit code" disabled={!!p.final} />
            <Btn disabled={!!p.final || code.length < 5}>Open case</Btn>
          </form>
          {p.final && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="terminal" style={{ marginTop: 12 }}>
              CASE FILE OPEN. Identity: still classified. Stamp awarded.
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
