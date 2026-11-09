import test from 'node:test'
import assert from 'node:assert/strict'
import { roomFor, roleFor, ownerIndex } from '../src/lib/game.js'
import { check } from '../src/lib/check.js'
import { applyOp, initialState, deriveReveal } from '../src/lib/store/reducer.js'

test('rotation matches the planned table', () => {
  const table = {
    A: ['chaos', 'brain', 'fearless', 'ignition'],
    B: ['brain', 'fearless', 'ignition', 'chaos'],
    C: ['fearless', 'ignition', 'chaos', 'brain'],
    D: ['ignition', 'chaos', 'brain', 'fearless'],
  }
  for (const [t, rooms] of Object.entries(table)) rooms.forEach((r, i) => assert.equal(roomFor(t, i + 1), r))
  for (let round = 1; round <= 4; round++) {
    const rooms = ['A', 'B', 'C', 'D'].map((t) => roomFor(t, round))
    assert.equal(new Set(rooms).size, 4, 'no two teams share a room in a round')
  }
})

test('roles rotate every round and cover all five', () => {
  for (let r = 1; r <= 5; r++) assert.equal(new Set([0, 1, 2, 3, 4].map((i) => roleFor(i, r).id)).size, 5)
  assert.notEqual(roleFor(0, 1).id, roleFor(0, 2).id)
})

test('items are shared round-robin for small teams', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => ownerIndex(i, 3)), [0, 1, 2, 0, 1])
})

test('brain factory answers', () => {
  assert.ok(check('b2.locker', '7') && check('b2.locker', ' Seven '.length ? '7' : ''))
  assert.ok(check('b4.code', 'lock') && check('b4.code', 'LOCK'))
  assert.ok(!check('b4.code', 'ORFN'))
  assert.ok(check('b5.seq', '64'))
  assert.ok(check('b6.final', '42-854') && !check('b6.final', '42855'))
  assert.ok(check('b1.clock', '3:00') && !check('b1.clock', '6:00'))
})

test('reducer writes and clears team fields', () => {
  let s = initialState()
  s = applyOp(s, { type: 'teamField', team: 'A', mission: 'chaos', key: 'name', value: 'Reflecto' })
  assert.equal(s.teams.A.progress.chaos.name, 'Reflecto')
  s = applyOp(s, { type: 'teamField', team: 'A', mission: 'chaos', key: 'name', value: null })
  assert.equal(s.teams.A.progress.chaos.name, undefined)
})

test('reveal payload never leaks the name early', () => {
  const vault = { A: { name: 'MAST', tagline: 't', clue: 'c', anthemUrl: 'u' }, B: { name: 'SAKKATH', tagline: 't2', clue: 'c2' }, C: { name: 'X', tagline: '', clue: '' }, D: { name: 'Y', tagline: '', clue: '' } }
  const ev = (reveal) => ({ reveal })
  const T0 = 1000
  const on = { authorised: true, final: false, teams: {} }
  // nothing before the reveal is open
  assert.equal(deriveReveal(ev({ ...on, authorised: false, teams: { A: { stage: 'clue', startedAt: T0 } } }), vault, 'A', T0).reveal, null)
  // a team sees only its own clue; other teams see nothing
  const clue = { ...on, teams: { A: { stage: 'clue', startedAt: T0 } } }
  assert.equal(deriveReveal(ev(clue), vault, 'A', T0).reveal.clue, 'c')
  assert.equal(deriveReveal(ev(clue), vault, 'A', T0).reveal.name, null)
  assert.equal(deriveReveal(ev(clue), vault, 'B', T0).reveal, null)
  assert.equal(deriveReveal(ev(clue), vault, null, T0).reveal, null)
  assert.deepEqual(deriveReveal(ev(clue), vault, 'B', T0).revealStatus, { A: 'clue' })
  // the countdown turns into the name by itself after 5 seconds
  const cd = { ...on, teams: { A: { stage: 'countdown', startedAt: T0 } } }
  assert.equal(deriveReveal(ev(cd), vault, 'A', T0 + 4900).reveal.stage, 'countdown')
  assert.equal(deriveReveal(ev(cd), vault, 'A', T0 + 4900).reveal.name, null)
  assert.equal(deriveReveal(ev(cd), vault, 'A', T0 + 5000).reveal.name, 'MAST')
  assert.equal(deriveReveal(ev(cd), vault, 'A', T0 + 5000).reveal.anthemUrl, 'u')
  // other teams never see A's name before the finale
  const other = deriveReveal(ev(cd), vault, 'B', T0 + 9000)
  assert.equal(other.reveal, null); assert.deepEqual(other.revealed, {})
  // finished: no overlay, own door stays open
  const done = deriveReveal(ev({ ...on, teams: { A: { stage: 'done', startedAt: T0 } } }), vault, 'A', T0 + 9000)
  assert.equal(done.reveal, null); assert.equal(done.revealed.A.name, 'MAST'); assert.equal(done.revealed.B, undefined)
  // finale: everyone, even the public screen, sees all four
  const fin = deriveReveal(ev({ ...on, final: true }), vault, null, T0)
  assert.equal(fin.final, true); assert.deepEqual(Object.keys(fin.revealed).sort(), ['A', 'B', 'C', 'D'])
  // finale needs the reveal to be open
  assert.deepEqual(deriveReveal(ev({ authorised: false, final: true, teams: {} }), vault, null, T0).revealed, {})
})
