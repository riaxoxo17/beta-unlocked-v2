import { useEffect, useState } from 'react'
import { store } from './store/index.js'

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
