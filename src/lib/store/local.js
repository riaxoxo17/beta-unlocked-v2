// Rehearsal store. Everything lives in this browser (localStorage + BroadcastChannel), so several tabs can
// play different people. It speaks the same interface as the live store, so pages never care which is in use.
import { applyOp, deriveReveal, initialState } from './reducer.js'
import { VAULT_DEFAULTS } from '../../content/vaultDefaults.js'
import { TEAMS, COUNTDOWN_SECONDS } from '../config.js'

const KEY = 'beta:state:v2'
const VKEY = 'beta:vault:v2'
const FKEY = 'beta:facilitators:v2'
const SKEY = 'beta:local-session' // per tab: who is signed in here
const GM_CODE = import.meta.env?.VITE_GM_PASSCODE || 'gm'

const readJSON = (storage, key, fallback) => {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'p_' + Math.random().toString(36).slice(2, 12))

export function createLocalStore() {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('beta-unlocked') : null
  const subs = new Set()
  const vault = () => readJSON(localStorage, VKEY, VAULT_DEFAULTS)
  const facilitators = () => readJSON(localStorage, FKEY, {})
  const session = () => readJSON(sessionStorage, SKEY, null)
  const raw = () => ({ ...initialState(), ...readJSON(localStorage, KEY, {}) })

  const build = () => {
    const s = raw()
    const sess = session()
    const me = !sess
      ? null
      : sess.role === 'player'
        ? { role: 'player', playerId: sess.playerId, teamId: s.players[sess.playerId]?.team || null }
        : { role: sess.role, playerId: null, teamId: sess.team || null, name: sess.name || null }
    const viewerTeam = me && me.role !== 'gm' ? me.teamId : null
    return { ...s, loaded: true, me, roster: Object.values(s.players), ...deriveReveal(s.event, vault(), viewerTeam, Date.now()) }
  }

  let state = build()
  let wake = null
  const emit = () => {
    state = build()
    subs.forEach((f) => f(state))
    // A countdown becomes the name by itself, so wake up when the next one finishes.
    clearTimeout(wake)
    const pending = Object.values(raw().event.reveal?.teams || {})
      .filter((e) => e && e.stage === 'countdown')
      .map((e) => e.startedAt + COUNTDOWN_SECONDS * 1000 - Date.now())
      .filter((ms) => ms > 0)
    if (pending.length) wake = setTimeout(emit, Math.min(...pending) + 20)
  }
  bc && (bc.onmessage = emit)
  window.addEventListener('storage', (e) => e.key && e.key.startsWith('beta:') && emit())

  const write = (next) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    bc && bc.postMessage('x')
    emit()
  }

  return {
    mode: 'local',
    now: () => Date.now(),
    getState: () => state,
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    async dispatch(op) {
      write(applyOp(raw(), op))
    },
    async reconnect() {
      return state
    },
    async logout() {
      sessionStorage.removeItem(SKEY)
      emit()
    },

    async joinPlayer(teamId, teamCode, name) {
      const team = TEAMS.find((t) => t.id === teamId)
      if (!team || team.code !== String(teamCode || '').trim().toUpperCase()) throw new Error('That team code is not correct.')
      const nm = String(name || '').trim()
      if (nm.length < 2 || nm.length > 30) throw new Error('Name must be between 2 and 30 characters.')
      if (Object.values(facilitators()).some((f) => (f.name || '').trim().toLowerCase() === nm.toLowerCase())) {
        throw new Error('That name belongs to a facilitator. Facilitators watch and guide, they do not play. Use the facilitator sign-in instead.')
      }
      const s = raw()
      const mates = Object.values(s.players).filter((p) => p.team === teamId)
      let player = mates.find((p) => p.name.toLowerCase() === nm.toLowerCase())
      if (!player) {
        player = { id: uid(), name: nm, team: teamId, joinedAt: Date.now() }
        write(applyOp(s, { type: 'player', player }))
      }
      sessionStorage.setItem(SKEY, JSON.stringify({ role: 'player', playerId: player.id }))
      emit()
      return player
    },

    async gmCheck(code) {
      if (code !== GM_CODE) throw new Error('Incorrect Game Master passcode.')
      sessionStorage.setItem(SKEY, JSON.stringify({ role: 'gm' }))
      emit()
      return true
    },

    async facilitatorLogin(code) {
      const c = String(code || '').trim().toUpperCase()
      const found = Object.entries(facilitators()).find(([, f]) => f.code && f.code === c)
      if (!found) throw new Error('That facilitator code is not recognised. Check with the Game Master.')
      sessionStorage.setItem(SKEY, JSON.stringify({ role: 'facilitator', team: found[0], name: found[1].name }))
      emit()
      return { team: found[0], teamId: found[0], name: found[1].name }
    },
    async facilitatorList() {
      return Object.entries(facilitators()).map(([team, f]) => ({ team, name: f.name, active: true }))
    },
    async facilitatorAssign(team, name, code) {
      const next = facilitators()
      next[team] = { name: String(name).trim(), code: String(code).trim().toUpperCase() }
      localStorage.setItem(FKEY, JSON.stringify(next))
      // A facilitator is not a player: drop anyone already in the game under that name.
      const nm = next[team].name.toLowerCase()
      const s = raw()
      Object.values(s.players).filter((p) => p.name.trim().toLowerCase() === nm).forEach((p) => write(applyOp(raw(), { type: 'removePlayer', id: p.id })))
      emit()
      return true
    },

    async vaultGet() {
      return vault()
    },
    async vaultSet(team, patch) {
      localStorage.setItem(VKEY, JSON.stringify({ ...vault(), [team]: { ...vault()[team], ...patch } }))
      emit()
      return true
    },
  }
}
