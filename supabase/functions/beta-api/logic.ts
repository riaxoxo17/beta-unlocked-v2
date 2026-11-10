// Pure game rules used by the Edge Function. Kept free of Deno and Supabase so Node can test it.
export const TEAM_CODES: Record<string, string> = { A: 'PURPLE', B: 'TEAL', C: 'GOLD', D: 'RED' }
export const TEAM_IDS = Object.keys(TEAM_CODES)
export const MISSIONS = ['chaos', 'brain', 'fearless', 'ignition']
export const ROOM_ORDER = ['chaos', 'brain', 'fearless', 'ignition']

// The room a team is in right now, or null between rooms. Same rotation as the browser (src/lib/game.js).
export function roomOfTeam(event: any, team: string): string | null {
  const step = Number(event?.step ?? 0)
  const isRound = step >= 1 && step <= 7 && step % 2 === 1
  if (!isRound) return null
  const round = (step + 1) / 2
  const idx = TEAM_IDS.indexOf(team)
  return idx < 0 ? null : ROOM_ORDER[(idx + round - 1) % ROOM_ORDER.length]
}

// True once a round's timer has run out (and is not paused). Players cannot write after this, so time is a hard stop.
export const HARD_STOP_GRACE_MS = 2000
export function roundIsOver(event: any, now: number): boolean {
  const step = Number(event?.step ?? 0)
  const isRound = step >= 1 && step <= 7 && step % 2 === 1
  return isRound && typeof event?.endsAt === 'number' && !event?.pausedAt && now > event.endsAt + HARD_STOP_GRACE_MS
}

export const STAGES = ['clue', 'countdown', 'name', 'done']
export const COUNTDOWN_MS = 5000

export const defaultReveal = () => ({ authorised: false, teams: {} as Record<string, any>, final: false })
export const DEFAULT_EVENT = {
  step: 0,
  stepStartedAt: null,
  endsAt: null,
  pausedAt: null,
  betaTarget: 1000000,
  roundSeconds: 420,
  transitionSeconds: 60,
  hqSeconds: 300,
  auto: false,
  reveal: defaultReveal(),
}

type VaultRow = { name: string; tagline: string; clue: string; anthemUrl?: string }

export function stageNow(entry: any, now: number): string | null {
  if (!entry || !entry.stage) return null
  if (entry.stage === 'countdown' && now - entry.startedAt >= COUNTDOWN_MS) return 'name'
  return entry.stage
}

// Same rule as the browser's deriveReveal (src/lib/store/reducer.js); a test keeps them identical.
export function deriveReveal(event: any, vault: Record<string, VaultRow>, viewerTeam: string | null = null, now: number = Date.now()) {
  const rv = { ...defaultReveal(), ...(event.reveal || {}) } as any
  const out: any = { reveal: null, revealed: {}, revealStatus: {}, final: false }
  if (!rv.authorised) return out
  for (const t of TEAM_IDS) {
    const st = stageNow(rv.teams?.[t], now)
    if (st) out.revealStatus[t] = st
  }
  if (rv.final) {
    out.final = true
    for (const [t, row] of Object.entries(vault)) out.revealed[t] = { name: row.name, tagline: row.tagline }
  }
  const mine = viewerTeam && rv.teams?.[viewerTeam]
  const st = mine ? stageNow(mine, now) : null
  if (st && vault[viewerTeam as string]) {
    const row = vault[viewerTeam as string]
    const atName = st === 'name' || st === 'done'
    if (atName) out.revealed[viewerTeam as string] = { name: row.name, tagline: row.tagline }
    if (st !== 'done') {
      out.reveal = {
        team: viewerTeam,
        stage: st,
        startedAt: mine.startedAt,
        clue: row.clue,
        name: atName ? row.name : null,
        tagline: atName ? row.tagline : null,
        anthemUrl: atName ? row.anthemUrl || null : null,
      }
    }
  }
  return out
}

export const stampsOf = (progress: any): string[] => MISSIONS.filter((m) => progress?.[m]?.stamp)

const isInt = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const isTime = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v > 0)

// Returns a safe event patch, or an error string.
export function cleanEventPatch(patch: any, current: any): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, error: 'Bad event update.' }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    switch (k) {
      case 'step':
        if (!isInt(v, 0, 20)) return { ok: false, error: 'Bad step.' }
        out.step = v
        break
      case 'stepStartedAt':
      case 'endsAt':
      case 'pausedAt':
        if (!isTime(v)) return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'roundSeconds':
      case 'transitionSeconds':
      case 'hqSeconds':
        if (!isInt(v, 5, 3600)) return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'betaTarget':
        if (!isInt(v, 10000, 1000000000)) return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'auto':
        if (typeof v !== 'boolean') return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      default:
        return { ok: false, error: `Unknown event field: ${k}.` }
    }
  }
  return { ok: true, value: out }
}

export const KEY_PATTERN = /^[A-Za-z0-9:_.\-]{1,80}$/
export function cleanFieldValue(v: unknown): { ok: true; value: unknown } | { ok: false } {
  if (v === null || v === undefined) return { ok: true, value: null }
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return JSON.stringify(v).length <= 4000 ? { ok: true, value: v } : { ok: false }
  }
  if (typeof v === 'object') return JSON.stringify(v).length <= 4000 ? { ok: true, value: v } : { ok: false }
  return { ok: false }
}
