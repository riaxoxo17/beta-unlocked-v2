import { TEAMS } from '../config.js'

export const blankProgress = () => ({ chaos: {}, brain: {}, fearless: {}, ignition: {} })
export const defaultReveal = () => ({ authorised: false, team: null, stage: null, startedAt: null, done: [] })
export const defaultEvent = () => ({
  step: 0,
  stepStartedAt: null,
  endsAt: null,
  roundSeconds: 420,
  transitionSeconds: 60,
  hqSeconds: 300,
  auto: false,
  autoBroker: false,
  reveal: defaultReveal(),
})

export const initialState = () => ({
  loaded: false,
  me: null, // who is looking: { role: 'player' | 'gm' | 'facilitator', playerId, teamId }
  event: defaultEvent(),
  teams: Object.fromEntries(TEAMS.map((t) => [t.id, { progress: blankProgress(), hint: null }])),
  players: {},
  roster: null, // names of every player, for the "who is out there" list
  summary: null, // public per-team stamp summary
  reveal: null, // what the current reveal stage is allowed to show
  revealed: {}, // identities of teams whose door is already open
})

export function applyOp(state, op) {
  const s = structuredClone(state)
  switch (op.type) {
    case 'event':
      Object.assign(s.event, op.patch)
      break
    case 'teamField': {
      s.teams[op.team] ||= { progress: blankProgress(), hint: null }
      const prog = s.teams[op.team].progress
      prog[op.mission] ||= {}
      if (op.value === null || op.value === undefined) delete prog[op.mission][op.key]
      else prog[op.mission][op.key] = op.value
      break
    }
    case 'resetMission':
      s.teams[op.team].progress[op.mission] = {}
      break
    case 'teamHint':
      s.teams[op.team].hint = op.hint
      break
    case 'player':
      s.players[op.player.id] = op.player
      break
    case 'removePlayer':
      delete s.players[op.id]
      break
    case 'resetProgress': {
      const fresh = initialState()
      s.event = fresh.event
      s.teams = fresh.teams
      break
    }
    case 'resetAll': {
      const fresh = initialState()
      s.event = fresh.event
      s.teams = fresh.teams
      s.players = {}
      break
    }
    default:
      break
  }
  return s
}

// What each reveal stage may show. The name only exists at the "name" stage (or once a door is marked done).
export function deriveReveal(event, vault) {
  const rv = event.reveal || defaultReveal()
  const out = { reveal: null, revealed: {} }
  if (!rv.authorised) return out
  for (const t of rv.done || []) {
    if (vault[t]) out.revealed[t] = { name: vault[t].name, tagline: vault[t].tagline }
  }
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
