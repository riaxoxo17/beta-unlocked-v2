// Live store. Talks only to the beta-api edge function: the browser never touches the database directly.
// Players, facilitators and the Game Master each get a session token that decides what they can read and write.
import { applyOp, defaultEvent, defaultReveal, blankProgress, initialState } from './reducer.js'
import { TEAMS } from '../config.js'

const SESSION_KEY = 'beta:api-session'
const MISSIONS = Object.keys(blankProgress())
const dropNulls = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== null))

// Accepts the project URL however it was pasted (with or without /rest/v1 or /functions/v1).
export const functionUrl = (url) =>
  url.trim().replace(/\/+$/, '').replace(/\/(rest|functions)\/v1(\/beta-api)?$/, '') + '/functions/v1/beta-api'

export function normalize(raw) {
  const base = initialState()
  const event = { ...defaultEvent(), ...(raw.event || {}) }
  event.reveal = { ...defaultReveal(), ...(event.reveal || {}) }

  const teams = { ...base.teams }
  for (const t of raw.teams || []) {
    teams[t.id] = {
      progress: Object.fromEntries(MISSIONS.map((m) => [m, dropNulls(t.progress?.[m])])),
      hint: t.hint || null,
    }
  }
  const toPlayer = (r) => ({ id: r.id, name: r.name, team: r.team, joinedAt: Date.parse(r.joined_at ?? r.joinedAt) || 0 })
  const players = Object.fromEntries((raw.players || []).map((r) => [r.id, toPlayer(r)]))
  const roster = (raw.roster || raw.players || []).map(toPlayer)

  const r = raw.reveal
  return {
    ...base,
    loaded: true,
    me: raw.me || null,
    event,
    teams,
    players,
    roster,
    summary: raw.summary || null,
    revealed: raw.revealed || {},
    reveal: r
      ? { team: r.team, stage: r.stage, startedAt: r.startedAt, clue: r.clue ?? null, name: r.name ?? null, tagline: r.tagline ?? null, anthemUrl: r.anthemUrl ?? null }
      : null,
  }
}

export function createSupabaseStore(url, publishableKey, fetchImpl) {
  const doFetch = fetchImpl || ((...a) => fetch(...a))
  const endpoint = functionUrl(url)
  const subs = new Set()
  let state = { ...initialState() }
  let timer = null
  let loading = false
  let writeSeq = 0
  let offset = 0

  const getToken = () => sessionStorage.getItem(SESSION_KEY)
  const setToken = (t) => (t ? sessionStorage.setItem(SESSION_KEY, t) : sessionStorage.removeItem(SESSION_KEY))
  const emit = () => subs.forEach((f) => f(state))

  async function request(action, payload = {}, authed = true) {
    const headers = { 'Content-Type': 'application/json', apikey: publishableKey }
    if (authed && getToken()) headers['x-beta-session'] = getToken()
    const res = await doFetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401 && authed && getToken()) {
        setToken(null)
        state = { ...state, me: null }
        emit()
      }
      throw new Error(body.error || 'Something went wrong. Please try again.')
    }
    return body
  }

  async function refresh() {
    if (loading) return
    loading = true
    const seq = writeSeq
    const t0 = Date.now()
    try {
      const raw = await request(getToken() ? 'getState' : 'publicState')
      if (typeof raw.serverNow === 'number') offset = raw.serverNow - (t0 + Date.now()) / 2
      if (seq !== writeSeq) return // a newer write is in flight; its own refresh will follow
      state = normalize(raw)
      emit()
    } catch (e) {
      if (!state.loaded) {
        state = { ...state, loaded: true }
        emit()
      }
    } finally {
      loading = false
    }
  }
  const start = () => {
    if (timer) return
    refresh()
    timer = setInterval(() => !document.hidden && refresh(), 1500)
  }
  const stop = () => {
    clearInterval(timer)
    timer = null
  }

  const signIn = async (action, payload) => {
    const r = await request(action, payload, false)
    setToken(r.token)
    loading = false
    await refresh()
    return r
  }

  return {
    mode: 'supabase',
    now: () => Date.now() + offset,
    getState: () => state,
    subscribe(fn) {
      subs.add(fn)
      start()
      return () => {
        subs.delete(fn)
        if (!subs.size) stop()
      }
    },
    async dispatch(op) {
      writeSeq++
      state = applyOp(state, op) // show it immediately
      emit()
      try {
        await request('dispatch', { op })
      } finally {
        writeSeq++
        loading = false
        await refresh()
      }
    },
    async reconnect() {
      await refresh()
      return state
    },
    async logout() {
      setToken(null)
      state = { ...initialState(), loaded: true }
      emit()
    },

    async gmCheck(code) {
      await signIn('gmLogin', { code })
      return true
    },
    async facilitatorLogin(code) {
      const r = await signIn('facilitatorLogin', { code })
      return { team: r.teamId, teamId: r.teamId, name: r.name }
    },
    async joinPlayer(teamId, teamCode, name) {
      const r = await signIn('joinPlayer', { teamId, teamCode, name })
      return r.player
    },

    async facilitatorList() {
      return (await request('facilitatorList')).facilitators ?? []
    },
    async facilitatorAssign(team, name, code) {
      await request('facilitatorAssign', { team, name, code })
      return true
    },
    async vaultGet() {
      const rows = (await request('vaultGet')).vault ?? []
      return Object.fromEntries(rows.map((r) => [r.team, { name: r.name || '', tagline: r.tagline || '', clue: r.clue || '', anthemUrl: r.anthem_url || '' }]))
    },
    async vaultSet(team, patch) {
      const { anthemUrl, ...rest } = patch
      await request('vaultSet', { team, patch: anthemUrl === undefined ? rest : { ...rest, anthem_url: anthemUrl } })
      return true
    },
  }
}

export const TEAM_IDS = TEAMS.map((t) => t.id)
