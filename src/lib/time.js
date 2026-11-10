import { useEffect, useRef, useState } from 'react'
import { store } from './store/index.js'
import { sfx } from './audio.js'

export function useNow(ms = 250) {
  const [n, setN] = useState(() => store.now())
  useEffect(() => {
    const id = setInterval(() => setN(store.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return n
}

// Remaining time as m:ss, with a leading + once it runs over.
export function fmt(ms) {
  const s = Math.ceil(Math.abs(ms) / 1000)
  const m = Math.floor(s / 60)
  return `${ms < 0 ? '+' : ''}${m}:${String(s % 60).padStart(2, '0')}`
}

// Milliseconds left on the round or move timer. Frozen while the Game Master has it paused. Null when there is no timer.
export const msLeft = (ev, now) => (ev?.endsAt ? ev.endsAt - (ev.pausedAt || now) : null)

// True once the timer has run out and is not paused.
export function useTimeUp(ev) {
  const now = useNow(250)
  const left = msLeft(ev, now)
  return left !== null && left <= 0 && !ev.pausedAt
}

// Ticks through the last ten seconds, then sounds a horn at zero. Plays on every screen that uses it.
export function useTimerAlerts(ev) {
  const now = useNow(250)
  const left = msLeft(ev, now)
  const lastSec = useRef(null)
  const hornFor = useRef(null)
  useEffect(() => {
    if (left === null || ev.pausedAt) return
    if (left > 0) {
      const sec = Math.ceil(left / 1000)
      if (sec <= 10 && sec !== lastSec.current) {
        lastSec.current = sec
        sfx.countdown(sec)
      }
      if (sec > 10) lastSec.current = null
    } else if (hornFor.current !== ev.endsAt && -left < 4000) {
      hornFor.current = ev.endsAt
      sfx.horn()
    }
  }, [left, ev.endsAt, ev.pausedAt])
}
