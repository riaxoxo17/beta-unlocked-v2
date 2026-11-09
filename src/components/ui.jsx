import { useEffect, useRef, useState } from 'react'
import { StampArt } from './art.jsx'
import { fmt, useNow } from '../lib/time.js'
import { store } from '../lib/store/index.js'

export const Panel = ({ className = '', children, ...r }) => (
  <div className={`panel ${className}`} {...r}>
    {children}
  </div>
)

export const Btn = ({ variant = 'primary', small, className = '', ...p }) => (
  <button
    className={`btn ${variant === 'ghost' ? 'btn-ghost' : ''} ${variant === 'danger' ? 'btn-danger' : ''} ${small ? 'btn-sm' : ''} ${className}`}
    {...p}
  />
)

// Text field shared by a whole team. Typing is saved shortly after you pause, and teammates'
// edits only overwrite your box while you are not typing in it.
export function SharedField({ value = '', onCommit, rows = 1, placeholder, disabled, maxLength, id }) {
  const [local, setLocal] = useState(value)
  const focused = useRef(false)
  const timer = useRef()
  useEffect(() => {
    if (!focused.current) setLocal(value ?? '')
  }, [value])
  const flush = (v) => {
    clearTimeout(timer.current)
    if (v !== (value ?? '')) onCommit(v)
  }
  const common = {
    id,
    className: 'input',
    value: local,
    disabled,
    placeholder,
    maxLength,
    onFocus: () => (focused.current = true),
    onBlur: (e) => {
      focused.current = false
      flush(e.target.value)
    },
    onChange: (e) => {
      setLocal(e.target.value)
      clearTimeout(timer.current)
      const v = e.target.value
      timer.current = setTimeout(() => onCommit(v), 400)
    },
  }
  return rows > 1 ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className="hint" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function Timer({ endsAt, size = 22 }) {
  const now = useNow(250)
  if (!endsAt) return null
  const left = endsAt - now
  return (
    <span className={`clock ${left < 0 ? 'late' : ''}`} style={{ fontSize: size }} aria-label="time remaining">
      {fmt(left)}
    </span>
  )
}

export function ConfirmBtn({ children, onConfirm, ...p }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Btn
      {...p}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? 'Press again to confirm' : children}
    </Btn>
  )
}

const PATHS = {
  star: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6L12 2z',
  crown: 'M3 18h18l-1.5-9-4.5 4-3-7-3 7-4.5-4L3 18zm1 2h16v2H4v-2z',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  flame: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z',
}
export function Symbol({ kind, size = 28, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d={PATHS[kind]} />
    </svg>
  )
}

export function Stamp({ room, earned, color = '#fff' }) {
  return <StampArt room={room.id} earned={earned} color={color} />
}

export function TeamChip({ team }) {
  return (
    <span className="chip" style={{ '--c': team.color }}>
      <span className="dot" />
      {team.name} · {team.colorName}
    </span>
  )
}

// Awards the room stamp once, the first time `complete` becomes true.
export function useAutoStamp(complete, stamped, set) {
  useEffect(() => {
    if (complete && !stamped) set('stamp', store.now())
  }, [complete, stamped]) // eslint-disable-line react-hooks/exhaustive-deps
}
