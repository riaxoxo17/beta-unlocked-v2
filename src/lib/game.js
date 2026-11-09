import { TEAMS, ROOM_ORDER, ROLES, STEPS } from './config.js'

export const toMs = (v) => (typeof v === 'number' ? v : Date.parse(v) || 0)

export const teamIndex = (id) => TEAMS.findIndex((t) => t.id === id)
export const teamById = (id) => TEAMS.find((t) => t.id === id)

// Each team starts in a different room and moves one room along every round.
export const roomFor = (teamId, round) => ROOM_ORDER[(teamIndex(teamId) + round - 1) % ROOM_ORDER.length]

export const currentRound = (step) => {
  const s = STEPS[Math.min(step, STEPS.length - 1)]
  if (s.phase === 'round') return s.round
  if (s.phase === 'transition') return s.round + 1
  if (s.phase === 'lobby') return 1
  return 4
}

export function stepDuration(stepIndex, ev) {
  const s = STEPS[stepIndex]
  if (s.phase === 'round') return ev.roundSeconds
  if (s.phase === 'transition') return ev.transitionSeconds
  if (s.phase === 'hq') return ev.hqSeconds
  return 0
}

export function teamPlayers(state, teamId) {
  return Object.values(state.players)
    .filter((p) => p.team === teamId)
    .sort((a, b) => toMs(a.joinedAt) - toMs(b.joinedAt) || a.id.localeCompare(b.id))
}

// Roles rotate by one every round.
export const roleFor = (playerIndex, round) => ROLES[(Math.max(playerIndex, 0) + Math.max(round, 1) - 1) % ROLES.length]

// Items (pitch sections, secret cards) are shared out round-robin, so teams of any size cover every item.
export function ownerIndex(itemIndex, playerCount) {
  return playerCount ? itemIndex % playerCount : 0
}

// Other teams' progress is private in live mode, so fall back to the public stamp summary.
export const stampsOf = (state, teamId) => {
  const own = ROOM_ORDER.filter((r) => state.teams[teamId]?.progress?.[r]?.stamp)
  return own.length ? own : state.summary?.[teamId]?.stamps || []
}

// Everyone who has checked in, across all teams (names only).
export const rosterOf = (state, teamId) =>
  (state.roster || Object.values(state.players)).filter((p) => p.team === teamId)

export function missionSummary(mission, p = {}) {
  if (mission === 'chaos') return p.submitted ? 'Pitch submitted' : `${(p.picks || []).length}/3 objects picked`
  if (mission === 'brain') {
    const n = [1, 2, 3, 4, 5].filter((i) => p['s' + i]).length
    return p.final ? 'Case solved' : `${n}/5 stations solved`
  }
  if (mission === 'fearless') {
    const c1 = ['food', 'weekend', 'habit'].filter((t) => p[`c1:${t}:who`] && p[`c1:${t}:what`]).length
    const c2 = Object.keys(p).filter((k) => /^c2:.+:done$/.test(k) && p[k]).length
    const c3 = [0, 1, 2].filter((i) => p[`c3:${i}:done`]).length
    return p.stamp ? 'Quest complete' : `Matches ${c1}/3, Dares ${c2} done, Choices ${c3}/3`
  }
  if (mission === 'ignition') {
    const fields = ['name', 'purpose', 'act1', 'act2', 'act3', 'tagline', 'pitch'].filter((k) => (p[k] || '').trim()).length
    return p.submitted ? 'Campaign submitted' : `${fields}/7 campaign fields`
  }
  return ''
}
