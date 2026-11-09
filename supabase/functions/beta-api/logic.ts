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

export const STAGES = ['clue', 'countdown', 'name']

export const defaultReveal = () => ({ authorised: false, team: null, stage: null, startedAt: null, done: [] as string[] })
export const DEFAULT_EVENT = {
  step: 0,
  stepStartedAt: null,
  endsAt: null,
  roundSeconds: 420,
  transitionSeconds: 60,
  hqSeconds: 300,
  auto: false,
  autoBroker: false,
  reveal: defaultReveal(),
}

type VaultRow = { name: string; tagline: string; clue: string; anthemUrl?: string }

// Same rule as the browser's deriveReveal. The name only leaves the server at the "name" stage,
// or once the Game Master has marked a door as done.
export function deriveReveal(event: any, vault: Record<string, VaultRow>) {
  const rv = { ...defaultReveal(), ...(event.reveal || {}) }
  const out: { reveal: any; revealed: Record<string, { name: string; tagline: string }> } = { reveal: null, revealed: {} }
  if (!rv.authorised) return out
  for (const t of rv.done || []) if (vault[t]) out.revealed[t] = { name: vault[t].name, tagline: vault[t].tagline }
  if (rv.team && rv.stage && vault[rv.team]) {
    const row = vault[rv.team]
    const atName = rv.stage === 'name'
    out.reveal = {
      team: rv.team,
      stage: rv.stage,
      startedAt: rv.startedAt,
      clue: row.clue,
      name: atName ? row.name : null,
      tagline: atName ? row.tagline : null,
      anthemUrl: atName ? row.anthemUrl || null : null,
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
        if (!isTime(v)) return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'roundSeconds':
      case 'transitionSeconds':
      case 'hqSeconds':
        if (!isInt(v, 5, 3600)) return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'auto':
      case 'autoBroker':
        if (typeof v !== 'boolean') return { ok: false, error: `Bad ${k}.` }
        out[k] = v
        break
      case 'reveal': {
        const r: any = v
        if (!r || typeof r !== 'object') return { ok: false, error: 'Bad reveal.' }
        const merged = { ...defaultReveal(), ...(current?.reveal || {}) } as any
        for (const [rk, rv] of Object.entries(r)) {
          if (rk === 'authorised') {
            if (typeof rv !== 'boolean') return { ok: false, error: 'Bad reveal.' }
            merged.authorised = rv
          } else if (rk === 'team') {
            if (rv !== null && !TEAM_IDS.includes(rv as string)) return { ok: false, error: 'Bad reveal team.' }
            merged.team = rv
          } else if (rk === 'stage') {
            if (rv !== null && !STAGES.includes(rv as string)) return { ok: false, error: 'Bad reveal stage.' }
            merged.stage = rv
          } else if (rk === 'startedAt') {
            if (!isTime(rv)) return { ok: false, error: 'Bad reveal time.' }
            merged.startedAt = rv
          } else if (rk === 'done') {
            if (!Array.isArray(rv) || rv.some((t) => !TEAM_IDS.includes(t))) return { ok: false, error: 'Bad reveal list.' }
            merged.done = [...new Set(rv as string[])]
          } else return { ok: false, error: 'Unknown reveal field.' }
        }
        out.reveal = merged
        break
      }
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
