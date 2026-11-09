import { TEAMS, COUNTDOWN_SECONDS } from '../config.js'

export const blankProgress = () => ({ chaos: {}, brain: {}, fearless: {}, ignition: {} })
// Reveal state. `teams[T]` is { stage: 'clue' | 'countdown' | 'name' | 'done', startedAt } and is run by that team's facilitator.
// `final` is the Game Master's switch that shows all four names to everyone at once.
export const defaultReveal = () => ({ authorised: false, teams: {}, final: false })
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
  reveal: null, // what this viewer's own reveal stage is allowed to show
  revealed: {}, // names this viewer may see (own team once revealed, everyone after the finale)
  revealStatus: {}, // stage per team, with no content, for status chips
  final: false, // the finale is on
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
    case 'reveal': {
      const rv = (s.event.reveal = { ...defaultReveal(), ...s.event.reveal })
      rv.teams = { ...rv.teams, [op.team]: op.stage ? { stage: op.stage, startedAt: op.at ?? Date.now() } : null }
      break
    }
    case 'revealFlag': {
      const rv = (s.event.reveal = { ...defaultReveal(), ...s.event.reveal })
      rv[op.key] = !!op.value
      break
    }
    case 'revealReset':
      s.event.reveal = { ...defaultReveal(), authorised: s.event.reveal?.authorised || false }
      break
    default:
      break
  }
  return s
}

// A countdown turns into the name by itself once its time is up, so no browser has to keep a timer running.
export function stageNow(entry, now) {
  if (!entry || !entry.stage) return null
  if (entry.stage === 'countdown' && now - entry.startedAt >= COUNTDOWN_SECONDS * 1000) return 'name'
  return entry.stage
}

// What a viewer may see. `viewerTeam` is the viewer's own team (null for the public screen and the Game Master).
// A name leaves the server only at the "name" stage of the viewer's own team, or once the finale is on.
export function deriveReveal(event, vault, viewerTeam = null, now = Date.now()) {
  const rv = { ...defaultReveal(), ...(event.reveal || {}) }
  const out = { reveal: null, revealed: {}, revealStatus: {}, final: false }
  if (!rv.authorised) return out
  for (const t of TEAMS.map((x) => x.id)) {
    const st = stageNow(rv.teams?.[t], now)
    if (st) out.revealStatus[t] = st
  }
  if (rv.final) {
    out.final = true
    for (const [t, row] of Object.entries(vault)) out.revealed[t] = { name: row.name, tagline: row.tagline }
  }
  const mine = viewerTeam && rv.teams?.[viewerTeam]
  const st = mine ? stageNow(mine, now) : null
  if (st && vault[viewerTeam]) {
    const row = vault[viewerTeam]
    const atName = st === 'name' || st === 'done'
    if (atName) out.revealed[viewerTeam] = { name: row.name, tagline: row.tagline }
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
