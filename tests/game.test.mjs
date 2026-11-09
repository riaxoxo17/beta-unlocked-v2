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
  const vault = { A: { name: 'MAST', tagline: 't', clue: 'c', anthemUrl: 'u' }, B: { name: 'SAKKATH', tagline: 't2', clue: 'c2' } }
  const ev = (reveal) => ({ reveal })
  const base = { authorised: true, team: 'A', stage: 'clue', startedAt: 1, done: [] }
  assert.equal(deriveReveal(ev({ ...base, authorised: false }), vault).reveal, null)
  assert.equal(deriveReveal(ev(base), vault).reveal.name, null)
  assert.equal(deriveReveal(ev(base), vault).reveal.clue, 'c')
  assert.equal(deriveReveal(ev({ ...base, stage: 'countdown' }), vault).reveal.name, null)
  assert.equal(deriveReveal(ev({ ...base, stage: 'name' }), vault).reveal.name, 'MAST')
  assert.equal(deriveReveal(ev({ ...base, stage: 'clue' }), vault).reveal.anthemUrl, null)
  const doneOnly = deriveReveal(ev({ ...base, team: null, stage: null, done: ['B'] }), vault)
  assert.equal(doneOnly.reveal, null)
  assert.equal(doneOnly.revealed.B.name, 'SAKKATH')
  assert.equal(doneOnly.revealed.A, undefined)
})
