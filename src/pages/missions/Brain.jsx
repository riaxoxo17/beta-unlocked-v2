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
  { n: 4, icon: '🖥️', title: 'The Sequence Terminal' },
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


function Compass() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Ornate compass">
      <circle cx="26" cy="26" r="23" fill="#d6b56d" stroke="#654321" strokeWidth="2.5" />
      <circle cx="26" cy="26" r="18" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
      <path d="M26 7L29 23L45 26L29 29L26 45L23 29L7 26L23 23Z" fill="#b45309" />
      <path d="M26 11L28 24L41 26L28 28L26 41L24 28L11 26L24 24Z" fill="#fef3c7" />
      <path d="M26 13L29 26L26 39L23 26Z" fill="#dc2626" />
      <circle cx="26" cy="26" r="3" fill="#1f2937" />
      <text x="26" y="6" fontSize="5" textAnchor="middle" fill="#422006">N</text>
      <text x="26" y="50" fontSize="5" textAnchor="middle" fill="#422006">S</text>
      <text x="5" y="28" fontSize="5" fill="#422006">W</text>
      <text x="45" y="28" fontSize="5" fill="#422006">E</text>
    </svg>
  )
}

function Hourglass() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Decorated hourglass">
      <path d="M12 5H40M12 47H40" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
      <path d="M15 8C15 17 22 20 26 26C30 20 37 17 37 8Z" fill="#fde68a" stroke="#92400e" strokeWidth="2" />
      <path d="M15 44C15 35 22 32 26 26C30 32 37 35 37 44Z" fill="#fde68a" stroke="#92400e" strokeWidth="2" />
      <path d="M18 12H34L26 23Z" fill="#38bdf8" />
      <path d="M19 40H33L26 29Z" fill="#38bdf8" />
      <path d="M26 23V29" stroke="#b45309" strokeWidth="2" />
      <circle cx="26" cy="26" r="2" fill="#b45309" />
      <path d="M18 8L21 5M34 8L31 5M18 44L21 47M34 44L31 47" stroke="#fbbf24" strokeWidth="2" />
    </svg>
  )
}

function ClockTower() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Old clock tower">
      <path d="M7 47H45L42 19H10Z" fill="#b8a28a" stroke="#574536" strokeWidth="2" />
      <path d="M5 20L26 5L47 20Z" fill="#7c3f27" stroke="#422b20" strokeWidth="2" />
      <path d="M22 5L26 1L30 5" fill="none" stroke="#d6b56d" strokeWidth="2" />
      <rect x="17" y="23" width="18" height="18" rx="9" fill="#fef3c7" stroke="#422b20" strokeWidth="2" />
      <circle cx="26" cy="32" r="7" fill="none" stroke="#92400e" strokeWidth="1" />
      <path d="M26 32V26M26 32L31 34" stroke="#422b20" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 24V44M39 24V44M20 47V42M32 47V42" stroke="#574536" strokeWidth="2" />
      <path d="M22 15H30M26 12V18" stroke="#fef3c7" strokeWidth="1.5" />
      <circle cx="26" cy="32" r="1.5" fill="#dc2626" />
    </svg>
  )
}

function TreasureChest() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Detailed treasure chest">
      <path d="M7 21Q7 7 26 7Q45 7 45 21Z" fill="#a16207" stroke="#713f12" strokeWidth="2" />
      <rect x="7" y="20" width="38" height="24" rx="3" fill="#92400e" stroke="#713f12" strokeWidth="2" />
      <path d="M14 10V43M38 10V43M7 25H45M7 39H45" stroke="#fbbf24" strokeWidth="3" />
      <path d="M23 24H29V34H23Z" fill="#facc15" stroke="#422006" strokeWidth="1.5" />
      <circle cx="26" cy="29" r="2" fill="#422006" />
      <path d="M12 16L17 13M40 16L35 13" stroke="#fde68a" strokeWidth="2" />
      <circle cx="13" cy="31" r="1.5" fill="#fde68a" />
      <circle cx="39" cy="31" r="1.5" fill="#fde68a" />
      <path d="M18 44V47M34 44V47" stroke="#713f12" strokeWidth="3" />
    </svg>
  )
}

function Magnifier() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Magnifying glass and fingerprint">
      <circle cx="21" cy="20" r="15" fill="#bfdbfe" fillOpacity=".55" stroke="#1e3a8a" strokeWidth="3" />
      <path d="M12 21C12 10 29 10 29 21M15 25C15 14 26 14 26 25M18 28C18 20 24 20 24 28M11 17C13 7 29 6 32 17" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
      <path d="M32 31L46 45" stroke="#78350f" strokeWidth="7" strokeLinecap="round" />
      <path d="M32 31L46 45" stroke="#d6a45c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="21" cy="20" r="2" fill="#1e3a8a" />
      <path d="M8 9L5 6M34 8L37 5" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  )
}

function Balloon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Patterned hot air balloon">
      <path d="M26 3C10 3 7 17 13 29C17 36 22 39 26 40C30 39 35 36 39 29C45 17 42 3 26 3Z" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
      <path d="M26 4V39M13 10L21 36M39 10L31 36" stroke="#dc2626" strokeWidth="2" />
      <path d="M14 14Q26 20 38 14M12 23Q26 29 40 23" fill="none" stroke="#2563eb" strokeWidth="2" />
      <path d="M20 40L22 44H30L32 40" fill="none" stroke="#78350f" strokeWidth="2" />
      <path d="M22 44V48H30V44Z" fill="#92400e" stroke="#422006" strokeWidth="1.5" />
      <circle cx="26" cy="15" r="3" fill="#fef3c7" />
      <path d="M21 7L26 11L31 7" fill="none" stroke="#fff7ed" strokeWidth="1.5" />
    </svg>
  )
}

function Lantern() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Antique lantern">
      <path d="M18 8Q18 1 26 1Q34 1 34 8" fill="none" stroke="#422006" strokeWidth="2.5" />
      <path d="M15 9H37L34 42H18Z" fill="#78350f" stroke="#422006" strokeWidth="2" />
      <path d="M19 14H33L31 37H21Z" fill="#fde68a" stroke="#fbbf24" strokeWidth="1.5" />
      <path d="M26 17C18 26 24 31 26 34C28 31 34 26 26 17Z" fill="#f97316" />
      <path d="M26 22C22 28 26 30 26 31C29 27 29 25 26 22Z" fill="#fef3c7" />
      <path d="M15 13H37M17 39H35M19 44H33" stroke="#422006" strokeWidth="2" />
      <path d="M12 9L15 13M40 9L37 13" stroke="#d6b56d" strokeWidth="2" />
      <circle cx="15" cy="25" r="1.5" fill="#fbbf24" />
      <circle cx="37" cy="25" r="1.5" fill="#fbbf24" />
    </svg>
  )
}

function Globe() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label="Detailed globe">
      <circle cx="26" cy="22" r="18" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2" />
      <path d="M11 15L17 12L20 17L18 22L23 25L20 31L14 28L10 21Z" fill="#65a30d" stroke="#365314" strokeWidth="1" />
      <path d="M29 7L34 11L32 17L38 19L35 26L29 28L26 23L28 17L24 12Z" fill="#65a30d" stroke="#365314" strokeWidth="1" />
      <path d="M22 31L27 28L31 33L28 38L23 36Z" fill="#65a30d" stroke="#365314" strokeWidth="1" />
      <path d="M8 22H44M26 4C17 12 17 32 26 40M26 4C35 12 35 32 26 40" fill="none" stroke="#dbeafe" strokeWidth="1" />
      <path d="M14 44H38M19 40V44M33 40V44" stroke="#78350f" strokeWidth="2.5" />
      <path d="M26 40V44" stroke="#78350f" strokeWidth="2" />
      <path d="M22 48H30" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="17" cy="17" r="1.5" fill="#fef3c7" />
      <circle cx="34" cy="25" r="1.5" fill="#fef3c7" />
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

  { id: 'compass', n: 'Ornate compass', node: <Compass /> },
  { id: 'hourglass', n: 'Decorated hourglass', node: <Hourglass /> },
  { id: 'tower', n: 'Old clock tower', node: <ClockTower /> },
  { id: 'chest', n: 'Treasure chest', node: <TreasureChest /> },
  { id: 'magnifier', n: 'Magnifying glass', node: <Magnifier /> },
  { id: 'balloon', n: 'Hot air balloon', node: <Balloon /> },
  { id: 'lantern', n: 'Antique lantern', node: <Lantern /> },
  { id: 'globe', n: 'Detailed globe', node: <Globe /> },
]



const QUESTIONS = [
  {
    id: 'cup',
    key: 'b1.cup',
    q: 'What colour was the cup?',
    opts: [['red', 'Red'], ['blue', 'Blue'], ['yellow', 'Yellow'], ['green', 'Green']]
  },
  {
    id: 'clock',
    key: 'b1.clock',
    q: 'What time did the small clock show?',
    opts: [['12:00', '12:00'], ['3:00', '3:00'], ['6:00', '6:00'], ['9:00', '9:00']]
  },
  {
    id: 'compass-direction',
    key: 'b1.compass-direction',
    q: 'Which direction was marked at the top of the compass?',
    opts: [['N', 'North'], ['S', 'South'], ['E', 'East'], ['W', 'West']]
  },
  {
    id: 'tower',
    key: 'b1.tower',
    q: 'What was positioned at the very top of the old clock tower?',
    opts: [['flag', 'A flag'], ['spike', 'A pointed finial'], ['bell', 'A bell'], ['bird', 'A bird']]
  },
  {
    id: 'magnifier',
    key: 'b1.magnifier',
    q: 'What was visible inside the magnifying glass?',
    opts: [['fingerprint', 'A fingerprint'], ['number', 'A number'], ['letter', 'A letter'], ['star', 'A star']]
  },
  {
    id: 'balloon',
    key: 'b1.balloon',
    q: 'Which colour appeared in the balloon stripes?',
    opts: [['red', 'Red'], ['purple', 'Purple'], ['green', 'Green'], ['black', 'Black']]
  },
  {
    id: 'globe',
    key: 'b1.globe',
    q: 'What colour were the continents on the globe?',
    opts: [['green', 'Green'], ['yellow', 'Yellow'], ['orange', 'Orange'], ['white', 'White']]
  },
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
        Study the desk for 20 seconds. Once it goes dark, answer all seven questions from memory. You can look {MAX_VIEWS} times, and your whole team sees
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
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (done) return

    if (code.trim() === '3747') {
      setMsg('')
      onPass()
    } else {
      setMsg('ACCESS DENIED. The evidence does not match.')
      setCode('')
      onFail()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      <div className="terminal">
        <div style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: 3 }}>
          CLASSIFIED CASE FILE · CASE 047
        </div>

        <h2 style={{ margin: '12px 0' }}>
          THE CASE OF THE MISSING MASTER KEY
        </h2>

        <p style={{ fontSize: 14 }}>
          At 11:47 PM, the master key disappeared from the control room.
          Four suspects were present. All four were questioned.
        </p>
      </div>

      <h3>THE SUSPECTS</h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10
      }}>
        {[
          ['ADA', 'LOCKER 2'],
          ['BRUNO', 'LOCKER 5'],
          ['CLEO', 'LOCKER 7'],
          ['DEV', 'LOCKER 9']
        ].map(([name, locker]) => (
          <div key={name} className="scene-item" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{locker}</div>
            <strong style={{ fontSize: 18 }}>{name}</strong>
          </div>
        ))}
      </div>

      <h3>THE INTERROGATIONS</h3>

      <div style={{ display: 'grid', gap: 10 }}>
        {[
          ['ADA', 'Bruno stole the master key.'],
          ['BRUNO', 'Dev stole the master key.'],
          ['CLEO', 'Bruno did NOT steal the master key.'],
          ['DEV', 'Cleo did NOT steal the master key.']
        ].map(([name, statement]) => (
          <div key={name} className="scene-item" style={{ padding: 14 }}>
            <strong style={{ color: 'var(--accent)' }}>{name}</strong>
            <p style={{ margin: '6px 0 0' }}>"{statement}"</p>
          </div>
        ))}
      </div>

      <div className="terminal">
        <strong>THE INVESTIGATOR'S FINAL NOTE</strong>
        <p style={{ marginBottom: 0 }}>
          Exactly ONE of the four statements is TRUE.
          The other THREE statements are FALSE.
        </p>
      </div>

      <h3>CRACK THE COMBINATION</h3>

      <p className="hint">
        Identify the thief first. Then calculate the four-digit locker code.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {[
          ['01', 'Number of FALSE statements'],
          ['02', "The thief's locker number"],
          ['03', "Number of letters in the thief's name"],
          ['04', 'Difference between the highest and lowest locker numbers']
        ].map(([n, clue]) => (
          <div key={n} className="scene-item"
            style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
            <strong style={{ color: 'var(--accent)', fontSize: 18 }}>{n}</strong>
            <span>{clue}</span>
          </div>
        ))}
      </div>

      <div className="terminal" style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7 }}>
          MASTER LOCKER ACCESS
        </div>

        <form onSubmit={submit} style={{
          display: 'grid',
          gap: 12,
          marginTop: 16
        }}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 4))
              setMsg('')
            }}
            placeholder="_ _ _ _"
            aria-label="Four digit combination"
            disabled={done}
            style={{
              textAlign: 'center',
              fontSize: 28,
              letterSpacing: 12,
              fontWeight: 800
            }}
          />

          <Btn disabled={done || code.length !== 4}>
            DECRYPT & UNLOCK
          </Btn>
        </form>

        {msg && !done && (
          <p style={{ color: 'var(--bad)', marginTop: 12 }}>
            {msg}
          </p>
        )}

        {wrong > 0 && !done && (
          <p style={{ fontSize: 12, opacity: 0.6 }}>
            Failed attempts: {wrong}
          </p>
        )}

        {done && (
          <div style={{ color: 'var(--accent)', marginTop: 14 }}>
            <strong>ACCESS GRANTED. MASTER KEY RECOVERED.</strong>
          </div>
        )}
      </div>

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
  const [msg, setMsg] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (done) return

    if (val.trim() === '3142') {
      setMsg('')
      onPass()
    } else {
      setVal('')
      setMsg('SEQUENCE REJECTED. Re-examine the clues.')
      onFail()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      <div className="terminal">
        <div style={{ color: 'var(--accent)', letterSpacing: 3, fontSize: 11 }}>
          SYSTEM ACCESS · PROTOCOL 04
        </div>

        <h3 style={{ margin: '12px 0' }}>THE SEQUENCE PROTOCOL</h3>

        <p>
          The terminal has scrambled four symbols.
          The security system will only accept them in their original order.
          Reconstruct the sequence using the evidence below.
        </p>
      </div>

      <h3>THE SYMBOL KEY</h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8
      }}>
        {[
          ['🔴', 'RED', '3'],
          ['🔵', 'BLUE', '1'],
          ['🟢', 'GREEN', '4'],
          ['🟡', 'YELLOW', '2']
        ].map(([symbol, name, digit]) => (
          <div key={name} className="scene-item"
            style={{ padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 26 }}>{symbol}</div>
            <strong style={{ fontSize: 11 }}>{name}</strong>
            <div style={{ fontSize: 18, color: 'var(--accent)' }}>
              {digit}
            </div>
          </div>
        ))}
      </div>

      <h3>RECOVERED EVIDENCE</h3>

      <div style={{ display: 'grid', gap: 10 }}>
        {[
          'The red symbol appears immediately before the blue symbol.',
          'The green symbol is neither the first nor the last.',
          'The yellow symbol appears somewhere after the blue symbol.',
          'The green symbol appears before the yellow symbol.'
        ].map((clue, i) => (
          <div key={i} className="scene-item"
            style={{ display: 'flex', gap: 12, padding: 12 }}>
            <strong style={{ color: 'var(--accent)' }}>
              {String(i + 1).padStart(2, '0')}
            </strong>
            <span>{clue}</span>
          </div>
        ))}
      </div>

      <div className="terminal">
        <strong>FINAL INSTRUCTION</strong>
        <p style={{ marginBottom: 0 }}>
          Determine the only possible order of the four symbols.
          Convert that sequence into digits using the symbol key.
          Enter the resulting four-digit code.
        </p>
      </div>

      <div className="terminal" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7 }}>
          TERMINAL OVERRIDE
        </div>

        <form onSubmit={submit}
          style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={val}
            onChange={(e) => {
              setVal(e.target.value.replace(/\D/g, '').slice(0, 4))
              setMsg('')
            }}
            placeholder="_ _ _ _"
            aria-label="Four digit sequence code"
            disabled={done}
            style={{
              textAlign: 'center',
              fontSize: 28,
              letterSpacing: 12,
              fontWeight: 800
            }}
          />

          <Btn disabled={done || val.length !== 4}>
            EXECUTE SEQUENCE
          </Btn>
        </form>

        {msg && !done && (
          <p style={{ color: 'var(--bad)', marginTop: 12 }}>
            {msg}
          </p>
        )}

        {done && (
          <p style={{ color: 'var(--accent)', marginTop: 12 }}>
            SEQUENCE ACCEPTED. SYSTEM UNLOCKED.
          </p>
        )}
      </div>

      {done && <Reward n={4} />}
    </div>
  )
}



function Station5({ p, set, done, onPass, onFail }) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [code, setCode] = useState('')
  const [stageError, setStageError] = useState('')

  const submit = (e) => {
    e.preventDefault()

    if (done) return

    if (first.trim() === '48' && second.trim() === '42') {
      setStageError('')
      onPass()
    } else {
      setStageError('INCORRECT SEQUENCE. Recheck both numerical patterns.')
      onFail()
    }
  }

  const open = (e) => {
    e.preventDefault()

    if (check('b6.final', code)) {
      sfx.stamp()
      set('final', store.now())
      set('stamp', store.now())
    } else {
      sfx.wrong()
    }
  }

  return (
    <div>
      <div className="terminal">
        <b>THE NUMBER PROTOCOL</b>
        <br />
        <br />
        &gt; TWO SEQUENCES DETECTED
        <br />
        &gt; SOLVE BOTH TO PROCEED
        <br />
        &gt; MULTIPLY YOUR ANSWERS
      </div>

      <div className="terminal" style={{ marginTop: 14 }}>
        <b>STAGE 1 — IDENTIFY THE MISSING NUMBER</b>
        <br />
        <br />
        <span style={{ fontSize: 24, letterSpacing: 2 }}>
          3, 8, 15, 24, 35, ?
        </span>
      </div>

      <div className="terminal" style={{ marginTop: 10 }}>
        <b>STAGE 2 — CRACK THE SECOND SEQUENCE</b>
        <br />
        <br />
        <span style={{ fontSize: 24, letterSpacing: 2 }}>
          2, 6, 12, 20, 30, ?
        </span>
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        Final instruction: Multiply your two answers and enter the result.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <input
          className="input"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          inputMode="numeric"
          placeholder="Stage 1 answer"
          aria-label="Stage 1 answer"
          disabled={done}
        />

        <input
          className="input"
          value={second}
          onChange={(e) => setSecond(e.target.value)}
          inputMode="numeric"
          placeholder="Stage 2 answer"
          aria-label="Stage 2 answer"
          disabled={done}
        />

        <Btn disabled={done || !first.trim() || !second.trim()}>
          Submit protocol
        </Btn>
      </form>

      {stageError && !done && (
        <p style={{ color: 'var(--bad)', marginTop: 10 }}>
          {stageError}
        </p>
      )}

      {done && (
        <>
          <Reward n={5} />

          <p style={{ marginTop: 16 }}>
            Both sequences decoded. You have all five digits.
            Enter them in order to open the case file.
          </p>

          <form onSubmit={open} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={5}
              placeholder="5-digit code"
              aria-label="Five digit code"
              disabled={!!p.final}
            />
            <Btn disabled={!!p.final || code.length < 5}>
              Open case
            </Btn>
          </form>

          {p.final && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="terminal"
              style={{ marginTop: 12 }}
            >
              CASE FILE OPEN. Identity: still classified. Stamp awarded.
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
