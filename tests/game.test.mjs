
import test from 'node:test'
import assert from 'node:assert/strict'

import { roomFor, roleFor, ownerIndex } from '../src/lib/game.js'
import { check } from '../src/lib/check.js'

import {
  applyOp,
  initialState,
  deriveReveal,
  applyTimerAction as clientTimer,
  freshRun as clientRun,
} from '../src/lib/store/reducer.js'

import {
  applyTimerAction as serverTimer,
  freshRun as serverRun,
} from '../supabase/functions/beta-api/logic.ts'


test('rotation matches the planned table', () => {
  const table = {
    A: ['chaos', 'brain', 'fearless', 'ignition'],
    B: ['brain', 'fearless', 'ignition', 'chaos'],
    C: ['fearless', 'ignition', 'chaos', 'brain'],
    D: ['ignition', 'chaos', 'brain', 'fearless'],
  }

  for (const [t, rooms] of Object.entries(table)) {
    rooms.forEach((r, i) => assert.equal(roomFor(t, i + 1), r))
  }

  for (let round = 1; round <= 4; round++) {
    const rooms = ['A', 'B', 'C', 'D'].map((t) => roomFor(t, round))
    assert.equal(new Set(rooms).size, 4, 'no two teams share a room in a round')
  }
})


test('roles rotate every round and cover all five', () => {
  for (let r = 1; r <= 5; r++) {
    assert.equal(
      new Set([0, 1, 2, 3, 4].map((i) => roleFor(i, r).id)).size,
      5
    )
  }

  assert.notEqual(roleFor(0, 1).id, roleFor(0, 2).id)
})


test('items are shared round-robin for small teams', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => ownerIndex(i, 3)),
    [0, 1, 2, 0, 1]
  )
})


test('brain factory answers', () => {
  // Station 1: Observation Desk
  assert.ok(check('b1.cup', 'blue'))
  assert.ok(check('b1.books', '1'))
  assert.ok(check('b1.clock', '3:00'))
  assert.ok(!check('b1.clock', '6:00'))
  assert.ok(check('b1.keylock', 'key'))
  assert.ok(check('b1.next', 'plant'))

  // Additional Station 1 observation questions
  assert.ok(check('b1.compass-direction', 'N'))
  assert.ok(check('b1.tower', 'spike'))
  assert.ok(check('b1.magnifier', 'fingerprint'))
  assert.ok(check('b1.balloon', 'red'))
  assert.ok(check('b1.globe', 'green'))

  // Station 2: Locked Locker
  assert.ok(check('b2.locker', '7'))

  // Station 3: Forgotten Library
  assert.ok(check('b3.book', 'missing-piece'))

  // Station 4: Sequence Protocol
  assert.ok(check('b4.code', '3142'))
  assert.ok(!check('b4.code', 'lock'))
  assert.ok(!check('b4.code', 'ORFN'))

  // Station 5: Number Protocol
  // Stage 1 answer: 48
  // Stage 2 answer: 42
  // Product: 2016
  // These are validated directly inside Station5.
  // No b5.seq hash is required.

  // Final case unlock
  assert.ok(check('b6.final', '42-854'))
  assert.ok(!check('b6.final', '42855'))
})


test('reducer writes and clears team fields', () => {
  let s = initialState()

  s = applyOp(s, {
    type: 'teamField',
    team: 'A',
    mission: 'chaos',
    key: 'name',
    value: 'Reflecto',
  })

  assert.equal(s.teams.A.progress.chaos.name, 'Reflecto')

  s = applyOp(s, {
    type: 'teamField',
    team: 'A',
    mission: 'chaos',
    key: 'name',
    value: null,
  })

  assert.equal(s.teams.A.progress.chaos.name, undefined)
})


test('reveal payload never leaks the name early', () => {
  const vault = {
    A: { name: 'MAST', tagline: 't', clue: 'c', anthemUrl: 'u' },
    B: { name: 'SAKKATH', tagline: 't2', clue: 'c2' },
    C: { name: 'X', tagline: '', clue: '' },
    D: { name: 'Y', tagline: '', clue: '' },
  }

  const ev = (reveal) => ({ reveal })
  const T0 = 1000
  const on = { authorised: true, final: false, teams: {} }

  // Nothing before the reveal is open
  assert.equal(
    deriveReveal(
      ev({
        ...on,
        authorised: false,
        teams: { A: { stage: 'clue', startedAt: T0 } },
      }),
      vault,
      'A',
      T0
    ).reveal,
    null
  )

  // A team sees only its own clue; other teams see nothing
  const clue = {
    ...on,
    teams: { A: { stage: 'clue', startedAt: T0 } },
  }

  assert.equal(deriveReveal(ev(clue), vault, 'A', T0).reveal.clue, 'c')
  assert.equal(deriveReveal(ev(clue), vault, 'A', T0).reveal.name, null)
  assert.equal(deriveReveal(ev(clue), vault, 'B', T0).reveal, null)
  assert.equal(deriveReveal(ev(clue), vault, null, T0).reveal, null)

  assert.deepEqual(
    deriveReveal(ev(clue), vault, 'B', T0).revealStatus,
    { A: 'clue' }
  )

  // Countdown turns into the name automatically after 5 seconds
  const cd = {
    ...on,
    teams: { A: { stage: 'countdown', startedAt: T0 } },
  }

  assert.equal(
    deriveReveal(ev(cd), vault, 'A', T0 + 4900).reveal.stage,
    'countdown'
  )

  assert.equal(
    deriveReveal(ev(cd), vault, 'A', T0 + 4900).reveal.name,
    null
  )

  assert.equal(
    deriveReveal(ev(cd), vault, 'A', T0 + 5000).reveal.name,
    'MAST'
  )

  assert.equal(
    deriveReveal(ev(cd), vault, 'A', T0 + 5000).reveal.anthemUrl,
    'u'
  )

  // Other teams never see A's name before the finale
  const other = deriveReveal(ev(cd), vault, 'B', T0 + 9000)

  assert.equal(other.reveal, null)
  assert.deepEqual(other.revealed, {})

  // Finished: no overlay, own door stays open
  const done = deriveReveal(
    ev({
      ...on,
      teams: { A: { stage: 'done', startedAt: T0 } },
    }),
    vault,
    'A',
    T0 + 9000
  )

  assert.equal(done.reveal, null)
  assert.equal(done.revealed.A.name, 'MAST')
  assert.equal(done.revealed.B, undefined)

  // Finale: everyone, even the public screen, sees all four
  const fin = deriveReveal(ev({ ...on, final: true }), vault, null, T0)

  assert.equal(fin.final, true)

  assert.deepEqual(
    Object.keys(fin.revealed).sort(),
    ['A', 'B', 'C', 'D']
  )

  // Finale needs the reveal to be open
  assert.deepEqual(
    deriveReveal(
      ev({ authorised: false, final: true, teams: {} }),
      vault,
      null,
      T0
    ).revealed,
    {}
  )
})


test('room timer rules are identical in the browser and on the server', () => {
  const steps = [
    ['start', 1000],
    ['pause', 5000],
    ['resume', 9000],
    ['extend', 9500],
    ['pause', 9600],
    ['restart', 12000],
    ['extend', 900000],
    ['nope', 1],
  ]

  let a = {
    seconds: 420,
    startedAt: null,
    endsAt: null,
    pausedAt: null,
  }

  let b = a

  for (const [action, now] of steps) {
    a = clientTimer(a, action, now, 420, 60) ?? a
    b = serverTimer(b, action, now, 420, 60) ?? b

    assert.deepEqual(a, b, action)
  }

  assert.equal(
    clientTimer(null, 'start', 100, 300).endsAt,
    100 + 300000
  )

  // A timer that has run out is revived by extending it
  assert.equal(
    clientTimer(
      { seconds: 60, startedAt: 0, endsAt: 1000, pausedAt: null },
      'extend',
      5000,
      60,
      60
    ).endsAt,
    65000
  )
})


test('a team moving to a step gets the same fresh run in the browser and on the server', () => {
  const ev = {
    roundSeconds: 420,
    transitionSeconds: 60,
    hqSeconds: 300,
    manualStart: false,
  }

  for (const manualStart of [false, true]) {
    for (let step = 0; step <= 9; step++) {
      assert.deepEqual(
        clientRun({ ...ev, manualStart }, step, 5000),
        serverRun({ ...ev, manualStart }, step, 5000)
      )
    }
  }
})
