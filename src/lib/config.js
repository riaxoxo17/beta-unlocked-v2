export const TEAMS = [
  { id: 'A', name: 'Team A', color: '#a855f7', colorName: 'Purple', code: 'PURPLE', door: 1, symbol: 'star' },
  { id: 'B', name: 'Team B', color: '#14b8a6', colorName: 'Teal', code: 'TEAL', door: 2, symbol: 'crown' },
  { id: 'C', name: 'Team C', color: '#f5b301', colorName: 'Gold', code: 'GOLD', door: 3, symbol: 'bolt' },
  { id: 'D', name: 'Team D', color: '#ef4444', colorName: 'Red', code: 'RED', door: 4, symbol: 'flame' },
]

export const ROOM_ORDER = ['chaos', 'brain', 'fearless', 'ignition']

export const ROOMS = {
  chaos: { id: 'chaos', title: 'The Chaos Lab', short: 'Chaos Lab', icon: '⚡', tag: 'Creativity, imagination, teamwork', mission: 'The Impossible Invention', stamp: 'Chaos Stamp' },
  brain: { id: 'brain', title: 'The Brain Factory', short: 'Brain Factory', icon: '🧠', tag: 'Logic, observation, decoding', mission: 'The Case of the Missing Identity', stamp: 'Brain Factory Stamp' },
  fearless: { id: 'fearless', title: 'The Fearless Arena', short: 'Fearless Arena', icon: '🏆', tag: 'Interaction, courage, trust', mission: 'The Human Connection Quest', stamp: 'Fearless Stamp' },
  ignition: { id: 'ignition', title: 'The Ignition Room', short: 'Ignition Room', icon: '🔥', tag: 'Creation, collaboration, identity', mission: 'Build Something That Matters', stamp: 'Ignition Stamp' },
}

export const ROLES = [
  { id: 'navigator', name: 'Navigator', desc: 'Leads movement and finds the next station.' },
  { id: 'hunter', name: 'Clue Hunter', desc: 'Reads clues and discovers hidden information.' },
  { id: 'timekeeper', name: 'Timekeeper', desc: 'Keeps the team on schedule.' },
  { id: 'spokesperson', name: 'Spokesperson', desc: "Presents the team's final answer." },
  { id: 'wildcard', name: 'Wildcard', desc: "Brings a unique idea or challenges the team's thinking." },
]

export const STEPS = [
  { key: 'lobby', label: 'HQ briefing', phase: 'lobby' },
  { key: 'r1', label: 'Round 1', phase: 'round', round: 1 },
  { key: 't1', label: 'Move to next room', phase: 'transition', round: 1 },
  { key: 'r2', label: 'Round 2', phase: 'round', round: 2 },
  { key: 't2', label: 'Move to next room', phase: 'transition', round: 2 },
  { key: 'r3', label: 'Round 3', phase: 'round', round: 3 },
  { key: 't3', label: 'Move to next room', phase: 'transition', round: 3 },
  { key: 'r4', label: 'Round 4', phase: 'round', round: 4 },
  { key: 'hq', label: 'Back at HQ', phase: 'hq' },
  { key: 'vault', label: 'Identity vault', phase: 'vault' },
]

export const COUNTDOWN_SECONDS = 5
