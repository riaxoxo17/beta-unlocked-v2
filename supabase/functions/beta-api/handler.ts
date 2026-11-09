import { DEFAULT_EVENT, KEY_PATTERN, MISSIONS, TEAM_CODES, TEAM_IDS, cleanEventPatch, cleanFieldValue, defaultReveal, deriveReveal, roomOfTeam, stampsOf } from './logic.ts'
import type { Repo } from './repo.ts'

export type Req = { headers: Record<string, string | undefined>; body: any; ip: string }
export type Res = { status: number; body: any }
export type Env = { gmPasscode: string }

const SESSION_MS = 12 * 60 * 60 * 1000
const FAIL_LIMIT = 12
const FAIL_WINDOW_S = 300

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
const bad = (m: string) => new HttpError(400, m)

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
const normCode = (c: unknown) => String(c ?? '').trim().toUpperCase()
const codeHash = (c: unknown) => sha256('facilitator:' + normCode(c))

function equalText(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

type Session = { role: 'player' | 'gm' | 'facilitator'; player_id: string | null; team_id: string | null; facilitator_name: string | null }

export function createHandler(repo: Repo, env: Env, clock: () => number = Date.now) {
  async function issue(role: Session['role'], extra: { playerId?: string; teamId?: string; name?: string } = {}) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    await repo.createSession({
      token_hash: await sha256(token),
      role,
      player_id: extra.playerId ?? null,
      team_id: extra.teamId ?? null,
      facilitator_name: extra.name ?? null,
      expires_at: new Date(clock() + SESSION_MS).toISOString(),
    })
    return token
  }

  async function sessionOf(req: Req): Promise<Session | null> {
    const token = req.headers['x-beta-session']
    if (!token) return null
    return (await repo.findSession(await sha256(token))) ?? null
  }

  async function guarded<T>(req: Req, action: string, check: () => Promise<T | null>): Promise<T> {
    const key = `${action}:${req.ip}`
    if (!(await repo.attempt(key, FAIL_LIMIT, FAIL_WINDOW_S, 0))) throw new HttpError(429, 'Too many wrong tries. Wait a few minutes and try again.')
    const result = await check()
    if (result === null) {
      await repo.attempt(key, FAIL_LIMIT, FAIL_WINDOW_S, 1)
      throw new HttpError(401, 'wrong')
    }
    return result
  }

  async function vaultMap() {
    const rows = await repo.getVault()
    return Object.fromEntries(rows.map((r: any) => [r.team, { name: r.name, tagline: r.tagline, clue: r.clue, anthemUrl: r.anthem_url }]))
  }

  async function buildState(sess: Session | null) {
    const [stored, allTeams, allPlayers, vault] = await Promise.all([repo.getEvent(), repo.getTeams(), repo.listPlayers(), vaultMap()])
    const event = { ...DEFAULT_EVENT, ...stored, reveal: { ...defaultReveal(), ...(stored.reveal || {}) } }
    const derived = deriveReveal(event, vault)
    const summary = Object.fromEntries(allTeams.map((t: any) => [t.id, { stamps: stampsOf(t.progress) }]))
    const base = { serverNow: clock(), event, summary, reveal: derived.reveal, revealed: derived.revealed }

    if (!sess) {
      return { ...base, me: null, teams: [], players: [], roster: allPlayers.map((p: any) => ({ id: p.id, team: p.team, name: '', joined_at: p.joined_at })) }
    }
    if (sess.role === 'gm') {
      return { ...base, me: { role: 'gm', playerId: null, teamId: null }, teams: allTeams, players: allPlayers, roster: allPlayers }
    }
    const team = sess.team_id as string
    return {
      ...base,
      me:
        sess.role === 'player'
          ? { role: 'player', playerId: sess.player_id, teamId: team }
          : { role: 'facilitator', playerId: null, teamId: team, name: sess.facilitator_name },
      teams: allTeams.filter((t: any) => t.id === team),
      players: allPlayers.filter((p: any) => p.team === team),
      roster: allPlayers,
    }
  }

  async function dispatch(sess: Session, op: any) {
    if (!op || typeof op !== 'object') throw bad('Bad update.')
    const gm = sess.role === 'gm'
    // A facilitator acts like a Game Master for their own team, in the room that team is in right now.
    const facilitatorMay = async (team: unknown, mission: unknown) =>
      sess.role === 'facilitator' && sess.team_id === team && roomOfTeam(await repo.getEvent(), sess.team_id as string) === mission
    switch (op.type) {
      case 'teamField': {
        if (!gm && !(sess.role === 'player' && sess.team_id === op.team) && !(await facilitatorMay(op.team, op.mission))) {
          throw new HttpError(403, sess.role === 'facilitator' ? 'You can only change the room your team is in right now.' : 'You can only change your own team.')
        }
        if (!TEAM_IDS.includes(op.team) || !MISSIONS.includes(op.mission)) throw bad('Unknown team or room.')
        if (typeof op.key !== 'string' || !KEY_PATTERN.test(op.key)) throw bad('Bad field name.')
        const v = cleanFieldValue(op.value)
        if (!v.ok) throw bad('That value is too large.')
        await repo.patchTeamField(op.team, op.mission, op.key, v.value)
        return
      }
      case 'teamHint': {
        if (!gm && !(sess.role === 'facilitator' && sess.team_id === op.team)) throw new HttpError(403, 'You can only send hints to your own team.')
        if (!TEAM_IDS.includes(op.team)) throw bad('Unknown team.')
        const h = op.hint
        if (h !== null && (typeof h !== 'object' || JSON.stringify(h).length > 1000)) throw bad('Bad hint.')
        await repo.setHint(op.team, h ?? null)
        return
      }
      case 'event': {
        if (!gm) throw new HttpError(403, 'Only the Game Master can do that.')
        const cleaned = cleanEventPatch(op.patch, await repo.getEvent())
        if (!cleaned.ok) throw bad(cleaned.error)
        await repo.patchEvent(cleaned.value)
        return
      }
      case 'resetMission':
        if (!gm && !(await facilitatorMay(op.team, op.mission))) throw new HttpError(403, 'Only the Game Master, or your team facilitator in the current room, can do that.')
        if (!TEAM_IDS.includes(op.team) || !MISSIONS.includes(op.mission)) throw bad('Unknown team or room.')
        await repo.resetMission(op.team, op.mission)
        return
      case 'removePlayer':
        if (!gm) throw new HttpError(403, 'Only the Game Master can do that.')
        if (typeof op.id !== 'string') throw bad('Bad player.')
        await repo.removePlayer(op.id)
        return
      case 'resetProgress':
        if (!gm) throw new HttpError(403, 'Only the Game Master can do that.')
        await repo.resetProgress()
        return
      case 'resetAll':
        if (!gm) throw new HttpError(403, 'Only the Game Master can do that.')
        await repo.resetAll()
        return
      default:
        throw bad('Unknown update.')
    }
  }

  async function run(req: Req): Promise<any> {
    const b = req.body || {}
    const action = b.action

    if (action === 'publicState') return buildState(null)

    if (action === 'gmLogin') {
      await guarded(req, 'gm', async () => (env.gmPasscode && equalText(String(b.code ?? ''), env.gmPasscode) ? true : null)).catch((e) => {
        if (e instanceof HttpError && e.status === 401) throw new HttpError(401, 'Incorrect Game Master passcode.')
        throw e
      })
      return { token: await issue('gm') }
    }

    if (action === 'joinPlayer') {
      const teamId = String(b.teamId ?? '')
      await guarded(req, 'team', async () => (TEAM_CODES[teamId] && normCode(b.teamCode) === TEAM_CODES[teamId] ? true : null)).catch((e) => {
        if (e instanceof HttpError && e.status === 401) throw new HttpError(401, 'That team code is not correct.')
        throw e
      })
      let joined
      try {
        joined = await repo.joinPlayer(teamId, String(b.name ?? ''))
      } catch (e: any) {
        if (String(e.message).includes('bad_name')) throw bad('Name must be between 2 and 30 characters.')
        throw e
      }
      const p = joined.player
      const token = await issue('player', { playerId: p.id, teamId })
      return { token, player: { id: p.id, name: p.name, team: p.team, joinedAt: Date.parse(p.joined_at) || 0 } }
    }

    if (action === 'facilitatorLogin') {
      const found = await guarded(req, 'facilitator', async () => (b.code ? await repo.findFacilitator(await codeHash(b.code)) : null)).catch((e) => {
        if (e instanceof HttpError && e.status === 401) throw new HttpError(401, 'That facilitator code is not recognised. Check with the Game Master.')
        throw e
      })
      return { token: await issue('facilitator', { teamId: found.team, name: found.name }), teamId: found.team, name: found.name }
    }

    // Everything below needs a signed-in session.
    const sess = await sessionOf(req)
    if (!sess) throw new HttpError(401, 'Your session has ended. Please sign in again.')

    switch (action) {
      case 'getState':
        return buildState(sess)
      case 'dispatch':
        await dispatch(sess, b.op)
        return { ok: true }
      case 'logout': {
        const token = req.headers['x-beta-session']
        if (token) await repo.deleteSession(await sha256(token))
        return { ok: true }
      }
      case 'facilitatorList':
      case 'facilitatorAssign':
      case 'vaultGet':
      case 'vaultSet':
        if (sess.role !== 'gm') throw new HttpError(403, 'Only the Game Master can do that.')
        break
      default:
        throw bad('Unknown action.')
    }

    if (action === 'facilitatorList') return { facilitators: await repo.listFacilitators() }
    if (action === 'facilitatorAssign') {
      const name = String(b.name ?? '').trim()
      const code = normCode(b.code)
      if (!TEAM_IDS.includes(b.team)) throw bad('Unknown team.')
      if (name.length < 2 || name.length > 40) throw bad('Enter the facilitator name.')
      if (code.length < 4 || code.length > 40) throw bad('The access code must be at least 4 characters.')
      try {
        await repo.upsertFacilitator(b.team, name, await codeHash(code))
      } catch (e: any) {
        if (String(e.message).includes('code_in_use')) throw new HttpError(409, 'Another facilitator already uses that code.')
        throw e
      }
      return { ok: true }
    }
    if (action === 'vaultGet') return { vault: await repo.getVault() }
    if (action === 'vaultSet') {
      if (!TEAM_IDS.includes(b.team)) throw bad('Unknown team.')
      const patch: Record<string, string> = {}
      for (const k of ['name', 'tagline', 'clue', 'anthem_url']) {
        const v = b.patch?.[k]
        if (v === undefined) continue
        if (typeof v !== 'string' || v.length > 600) throw bad(`Bad ${k}.`)
        patch[k] = v
      }
      await repo.setVault(b.team, patch)
      return { ok: true }
    }
  }

  return async function handle(req: Req): Promise<Res> {
    try {
      return { status: 200, body: await run(req) }
    } catch (e: any) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } }
      console.error('beta-api error', e)
      return { status: 500, body: { error: 'Something went wrong on the server. Please try again.' } }
    }
  }
}
