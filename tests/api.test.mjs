import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { createRepo } from '../supabase/functions/beta-api/repo.ts'
import { createHandler } from '../supabase/functions/beta-api/handler.ts'
import { deriveReveal as serverDerive } from '../supabase/functions/beta-api/logic.ts'
import { deriveReveal as clientDerive } from '../src/lib/store/reducer.js'
import { createSupabaseStore, normalize, functionUrl } from '../src/lib/store/supabase.js'

async function setup() {
  const db = new PGlite()
  await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
  const rpc = async (fn, params) => {
    if (!/^api_[a-z_]+$/.test(fn)) throw new Error('bad fn')
    const r = await db.query(`select ${fn}($1::jsonb) as r`, [JSON.stringify(params.p ?? {})])
    return r.rows[0].r
  }
  const clock = { t: Date.now() }
  const handler = createHandler(createRepo(rpc), { gmPasscode: 'secret-gm' }, () => clock.t)
  let n = 0
  const call = async (body, token, ip = '1.1.1.' + (n++ % 200)) =>
    handler({ headers: { 'x-beta-session': token }, body, ip })
  return { db, call, clock }
}
const join = async (call, team, code, name) => call({ action: 'joinPlayer', teamId: team, teamCode: code, name }, undefined, 'same-wifi')

test('schema runs twice without error (idempotent)', async () => {
  const db = new PGlite()
  const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  await db.exec(sql)
  await db.exec(sql)
})

test('joining: team code, no size limit, rejoin by name', async () => {
  const { call } = await setup()
  assert.equal((await join(call, 'A', 'WRONG', 'Asha')).status, 401)
  const first = await join(call, 'A', 'purple', 'Asha')
  assert.equal(first.status, 200)
  assert.ok(first.body.token && first.body.player.id)
  const again = await join(call, 'A', 'PURPLE', 'asha')
  assert.equal(again.body.player.id, first.body.player.id, 'same name rejoins as the same player')
  for (const n of ['Bo', 'Cy', 'Di', 'Ed']) assert.equal((await join(call, 'A', 'PURPLE', n)).status, 200)
  for (const n of ['Fay', 'Gus', 'Hia']) assert.equal((await join(call, 'A', 'PURPLE', n)).status, 200)
  assert.equal((await call({ action: 'publicState' })).body.roster.length, 8)
  assert.equal((await join(call, 'A', 'PURPLE', 'x')).status, 400)
})

test('players only see their own team; the public sees no names, no progress, no secrets', async () => {
  const { call } = await setup()
  const a = (await join(call, 'A', 'PURPLE', 'Asha')).body
  const b = (await join(call, 'B', 'TEAL', 'Bina')).body
  await call({ action: 'dispatch', op: { type: 'teamField', team: 'A', mission: 'chaos', key: 'secret', value: 'only-A' } }, a.token)
  const mine = (await call({ action: 'getState' }, a.token)).body
  assert.equal(mine.me.teamId, 'A')
  assert.deepEqual(mine.teams.map((t) => t.id), ['A'])
  assert.equal(mine.teams[0].progress.chaos.secret, 'only-A')
  assert.deepEqual(mine.players.map((p) => p.name), ['Asha'])
  assert.ok(mine.roster.some((p) => p.name === 'Bina'), 'roster shows everyone by name')
  const theirs = (await call({ action: 'getState' }, b.token)).body
  assert.ok(!JSON.stringify(theirs).includes('only-A'))
  const pub = (await call({ action: 'publicState' })).body
  assert.equal(pub.me, null)
  assert.deepEqual(pub.teams, [])
  assert.ok(pub.roster.every((p) => p.name === ''))
  assert.ok(!JSON.stringify(pub).includes('MAST'), 'no identity in public state')
  assert.ok(!JSON.stringify(mine).includes('MAST'))
})

test('permissions: players cannot touch other teams or run the event', async () => {
  const { call } = await setup()
  const a = (await join(call, 'A', 'PURPLE', 'Asha')).body
  const field = (team, key = 'k', value = 1) => call({ action: 'dispatch', op: { type: 'teamField', team, mission: 'chaos', key, value } }, a.token)
  assert.equal((await field('A')).status, 200)
  assert.equal((await field('B')).status, 403)
  assert.equal((await field('A', 'bad key!')).status, 400)
  assert.equal((await field('A', 'big', 'x'.repeat(5000))).status, 400)
  for (const op of [{ type: 'event', patch: { step: 1 } }, { type: 'resetAll' }, { type: 'resetProgress' }, { type: 'teamHint', team: 'A', hint: null }, { type: 'player', player: {} }]) {
    assert.ok([400, 403].includes((await call({ action: 'dispatch', op }, a.token)).status), JSON.stringify(op))
  }
  for (const action of ['vaultGet', 'facilitatorList']) assert.equal((await call({ action }, a.token)).status, 403)
  assert.equal((await call({ action: 'getState' }, 'garbage')).status, 401)
  assert.equal((await call({ action: 'getState' })).status, 401)
})

test('simultaneous teammates do not overwrite each other', async () => {
  const { call } = await setup()
  const t = []
  for (const n of ['P1', 'P2', 'P3', 'P4', 'P5']) t.push((await join(call, 'C', 'GOLD', n)).body.token)
  await Promise.all(t.map((tok, i) => call({ action: 'dispatch', op: { type: 'teamField', team: 'C', mission: 'brain', key: 'k' + i, value: i } }, tok)))
  const st = (await call({ action: 'getState' }, t[0])).body
  assert.equal(Object.keys(st.teams[0].progress.brain).length, 5)
  await call({ action: 'dispatch', op: { type: 'teamField', team: 'C', mission: 'brain', key: 'k0', value: null } }, t[0])
  assert.equal(Object.keys((await call({ action: 'getState' }, t[0])).body.teams[0].progress.brain).length, 4)
})

test('Game Master: login limits and event control', async () => {
  const { call } = await setup()
  assert.equal((await call({ action: 'gmLogin', code: 'nope' }, undefined, '9.9.9.9')).status, 401)
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, '9.9.9.9')).body.token
  const a = (await join(call, 'A', 'PURPLE', 'Asha')).body
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { step: 2, endsAt: 123456 } } }, gm)).status, 200)
  assert.equal((await call({ action: 'getState' }, a.token)).body.event.step, 2)
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { step: -4 } } }, gm)).status, 400)
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { hacked: 1 } } }, gm)).status, 400)
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { reveal: { final: true } } } }, gm)).status, 400, 'reveal only changes through its own operations')
})

test('identity reveal: per team, run by the facilitator, then a finale for everyone', async () => {
  const { call, clock } = await setup()
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'g')).body.token
  for (const [team, code] of [['A', 'fac-a'], ['B', 'fac-b']]) await call({ action: 'facilitatorAssign', team, name: 'F' + team, code }, gm)
  const fa = (await call({ action: 'facilitatorLogin', code: 'fac-a' }, undefined, 'fa')).body.token
  const fb = (await call({ action: 'facilitatorLogin', code: 'fac-b' }, undefined, 'fb')).body.token
  const pa = (await join(call, 'A', 'PURPLE', 'Asha')).body.token
  const pb = (await join(call, 'B', 'TEAL', 'Bina')).body.token
  const act = (tok, op) => call({ action: 'dispatch', op }, tok)
  const st = async (tok) => (await call({ action: 'getState' }, tok)).body
  const has = async (tok, word) => JSON.stringify(await st(tok)).includes(word)
  const pub = async (word) => JSON.stringify((await call({ action: 'publicState' })).body).includes(word)

  // not open yet
  assert.equal((await act(fa, { type: 'reveal', team: 'A', stage: 'clue' })).status, 409)
  assert.equal((await act(gm, { type: 'revealFlag', key: 'authorised', value: true })).status, 200)
  // a facilitator can only run their own team, and a player cannot run anything
  assert.equal((await act(fa, { type: 'reveal', team: 'B', stage: 'clue' })).status, 403)
  assert.equal((await act(pa, { type: 'reveal', team: 'A', stage: 'clue' })).status, 403)
  assert.equal((await act(pa, { type: 'revealFlag', key: 'final', value: true })).status, 403)
  assert.equal((await act(fa, { type: 'revealFlag', key: 'final', value: true })).status, 403)
  // steps must go in order
  assert.equal((await act(fa, { type: 'reveal', team: 'A', stage: 'countdown' })).status, 409)

  // team A's clue: only team A sees it
  assert.equal((await act(fa, { type: 'reveal', team: 'A', stage: 'clue' })).status, 200)
  assert.equal((await st(pa)).reveal.stage, 'clue'); assert.ok((await st(pa)).reveal.clue)
  assert.equal((await st(pb)).reveal, null, 'team B sees nothing of A')
  assert.equal(await has(pb, 'MAST'), false)
  assert.equal((await st(pb)).revealStatus.A, 'clue')
  // team B can start at the same time without disturbing A
  assert.equal((await act(fb, { type: 'reveal', team: 'B', stage: 'clue' })).status, 200)
  assert.equal((await st(pa)).reveal.stage, 'clue'); assert.equal((await st(pb)).reveal.stage, 'clue')

  // countdown, then the name after the time is up (server clock)
  assert.equal((await act(fa, { type: 'reveal', team: 'A', stage: 'countdown' })).status, 200)
  assert.equal(await has(pa, 'MAST'), false, 'no name during the countdown')
  clock.t += 4000
  assert.equal(await has(pa, 'MAST'), false, 'still counting down')
  clock.t += 1500
  assert.equal((await st(pa)).reveal.stage, 'name'); assert.equal((await st(pa)).reveal.name, 'MAST')
  assert.equal(await has(pb, 'MAST'), false, 'team B still cannot see it'); assert.equal(await pub('MAST'), false, 'nor the big screen')
  assert.equal((await act(fa, { type: 'reveal', team: 'A', stage: 'done' })).status, 200)
  assert.equal((await st(pa)).reveal, null); assert.equal((await st(pa)).revealed.A.name, 'MAST', 'their own door stays open')
  assert.equal(await has(pb, 'MAST'), false)

  // team B finishes too, then the Game Master shows the finale to everyone
  await act(fb, { type: 'reveal', team: 'B', stage: 'countdown' }); clock.t += 6000
  await act(fb, { type: 'reveal', team: 'B', stage: 'done' })
  assert.equal(await pub('SAKKATH'), false)
  assert.equal((await act(gm, { type: 'revealFlag', key: 'final', value: true })).status, 200)
  for (const tok of [pa, pb]) {
    const s2 = await st(tok)
    assert.equal(s2.final, true); assert.deepEqual(Object.keys(s2.revealed).sort(), ['A', 'B', 'C', 'D'])
  }
  const p2 = (await call({ action: 'publicState' })).body
  assert.equal(p2.final, true); assert.equal(p2.revealed.C.name, 'BINDAAS'); assert.equal(p2.revealed.D.name, 'BENKI')
  // switching it off, and closing the reveal, hides everything again
  await act(gm, { type: 'revealFlag', key: 'final', value: false })
  assert.equal(await pub('BINDAAS'), false)
  await act(gm, { type: 'revealFlag', key: 'final', value: true })
  await act(gm, { type: 'revealFlag', key: 'authorised', value: false })
  assert.equal(await pub('BINDAAS'), false, 'closing the reveal hides it all')
  await act(gm, { type: 'revealFlag', key: 'authorised', value: true })
  await act(gm, { type: 'revealReset' })
  const after = await st(pa)
  assert.equal(after.final, false); assert.deepEqual(after.revealed, {}); assert.deepEqual(after.revealStatus, {})
})

test('vault edit and facilitator flow', async () => {
  const { call } = await setup()
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'g')).body.token
  assert.equal((await call({ action: 'vaultSet', team: 'B', patch: { name: 'NEWNAME', anthem_url: 'https://x.test/a.mp3' } }, gm)).status, 200)
  const v = (await call({ action: 'vaultGet' }, gm)).body.vault
  assert.equal(v.find((r) => r.team === 'B').name, 'NEWNAME')

  assert.equal((await call({ action: 'facilitatorAssign', team: 'A', name: 'Riya', code: 'ab' }, gm)).status, 400)
  assert.equal((await call({ action: 'facilitatorAssign', team: 'A', name: 'Riya', code: 'fac-a1' }, gm)).status, 200)
  assert.equal((await call({ action: 'facilitatorAssign', team: 'B', name: 'Kunal', code: 'FAC-A1' }, gm)).status, 409, 'codes are unique')
  assert.equal((await join(call, 'A', 'PURPLE', 'riya')).status, 403, 'a facilitator cannot join as a player')
  assert.equal((await call({ action: 'facilitatorLogin', code: 'nope' }, undefined, 'f1')).status, 401)
  const f = await call({ action: 'facilitatorLogin', code: 'FAC-a1' }, undefined, 'f1')
  assert.equal(f.status, 200); assert.equal(f.body.teamId, 'A')
  const st = (await call({ action: 'getState' }, f.body.token)).body
  assert.equal(st.me.role, 'facilitator'); assert.equal(st.me.name, 'Riya'); assert.deepEqual(st.teams.map((t) => t.id), ['A'])
  assert.equal((await call({ action: 'dispatch', op: { type: 'teamHint', team: 'A', hint: { text: 'Look left', at: 1 } } }, f.body.token)).status, 200)
  assert.equal((await call({ action: 'dispatch', op: { type: 'teamHint', team: 'B', hint: null } }, f.body.token)).status, 403)
  assert.equal((await call({ action: 'getState' }, f.body.token)).body.teams[0].hint.text, 'Look left')
  assert.equal((await call({ action: 'vaultGet' }, f.body.token)).status, 403)
  const list = (await call({ action: 'facilitatorList' }, gm)).body.facilitators
  assert.deepEqual(list, [{ team: 'A', name: 'Riya' }])
  assert.ok(!JSON.stringify(list).includes('fac-a1'), 'codes are never returned')
  // changing the code signs the old session out
  await call({ action: 'facilitatorAssign', team: 'A', name: 'Riya', code: 'fac-a2' }, gm)
  assert.equal((await call({ action: 'getState' }, f.body.token)).status, 401)
})

test('facilitator controls only their own team, in the room it is in now', async () => {
  const { call } = await setup()
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'g')).body.token
  await call({ action: 'facilitatorAssign', team: 'A', name: 'Riya', code: 'fac-a' }, gm)
  const f = (await call({ action: 'facilitatorLogin', code: 'fac-a' }, undefined, 'f')).body.token
  const op = (o) => call({ action: 'dispatch', op: o }, f)
  const stamp = (team, mission) => op({ type: 'teamField', team, mission, key: 'stamp', value: 1 })
  // lobby: team A is in no room yet
  assert.equal((await stamp('A', 'chaos')).status, 403)
  // round 1: team A is in chaos, team B in brain
  await call({ action: 'dispatch', op: { type: 'event', patch: { step: 1 } } }, gm)
  assert.equal((await stamp('A', 'chaos')).status, 200)
  assert.equal((await stamp('A', 'brain')).status, 403, 'not the room it is in')
  assert.equal((await stamp('B', 'brain')).status, 403, 'not their team')
  assert.equal((await op({ type: 'resetMission', team: 'A', mission: 'chaos' })).status, 200)
  assert.equal((await op({ type: 'resetMission', team: 'B', mission: 'brain' })).status, 403)
  assert.equal((await op({ type: 'event', patch: { step: 2 } })).status, 403, 'still no event control')
  assert.equal((await op({ type: 'resetAll' })).status, 403)
  // round 2: team A moves to brain
  await call({ action: 'dispatch', op: { type: 'event', patch: { step: 3 } } }, gm)
  assert.equal((await stamp('A', 'brain')).status, 200)
  assert.equal((await stamp('A', 'chaos')).status, 403)
})

test('wrong guesses get blocked even if the right code follows', async () => {
  const { call } = await setup()
  for (let i = 0; i < 12; i++) assert.equal((await call({ action: 'gmLogin', code: 'x' + i }, undefined, 'attacker')).status, 401)
  assert.equal((await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'attacker')).status, 429)
  assert.equal((await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'someone-else')).status, 200)
})

test('removing a player ends their session; logout ends the session', async () => {
  const { call } = await setup()
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'g')).body.token
  const a = (await join(call, 'D', 'RED', 'Dev')).body
  assert.equal((await call({ action: 'getState' }, a.token)).status, 200)
  await call({ action: 'dispatch', op: { type: 'removePlayer', id: a.player.id } }, gm)
  assert.equal((await call({ action: 'getState' }, a.token)).status, 401)
  const b = (await join(call, 'D', 'RED', 'Esha')).body
  await call({ action: 'logout' }, b.token)
  assert.equal((await call({ action: 'getState' }, b.token)).status, 401)
})

test('resetAll clears players and progress', async () => {
  const { call } = await setup()
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, 'g')).body.token
  const a = (await join(call, 'A', 'PURPLE', 'Asha')).body
  await call({ action: 'dispatch', op: { type: 'teamField', team: 'A', mission: 'chaos', key: 'stamp', value: true } }, a.token)
  assert.deepEqual((await call({ action: 'publicState' })).body.summary.A.stamps, ['chaos'])
  await call({ action: 'dispatch', op: { type: 'resetAll' } }, gm)
  const st = (await call({ action: 'getState' }, gm)).body
  assert.equal(st.players.length, 0); assert.deepEqual(st.teams[0].progress.chaos, {})
})

test('server and browser reveal rules agree', () => {
  const vault = { A: { name: 'MAST', tagline: 't', clue: 'c', anthemUrl: 'u' }, B: { name: 'S', tagline: 't2', clue: 'c2', anthemUrl: '' }, C: { name: 'X', tagline: '', clue: '' }, D: { name: 'Y', tagline: '', clue: '' } }
  const stages = [undefined, { stage: 'clue', startedAt: 1000 }, { stage: 'countdown', startedAt: 1000 }, { stage: 'name', startedAt: 1000 }, { stage: 'done', startedAt: 1000 }]
  let n = 0
  for (const authorised of [true, false]) for (const final of [true, false]) for (const a of stages) for (const b of stages) for (const viewer of [null, 'A', 'B', 'C']) for (const now of [1000, 5999, 6000, 20000]) {
    const ev = { reveal: { authorised, final, teams: { A: a, B: b } } }
    assert.deepEqual(serverDerive(ev, vault, viewer, now), clientDerive(ev, vault, viewer, now), JSON.stringify([ev, viewer, now]))
    n++
  }
  assert.ok(n > 1000)
})

test('client store: url forms, normalising, and a full round trip against the real handler', async () => {
  assert.equal(functionUrl('https://x.supabase.co/rest/v1/'), 'https://x.supabase.co/functions/v1/beta-api')
  assert.equal(functionUrl('https://x.supabase.co'), 'https://x.supabase.co/functions/v1/beta-api')
  assert.equal(functionUrl('https://x.supabase.co/functions/v1/beta-api'), 'https://x.supabase.co/functions/v1/beta-api')

  const { call } = await setup()
  const mem = new Map()
  globalThis.sessionStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  globalThis.document = { hidden: false }
  const fetchImpl = async (_url, init) => {
    const res = await call(JSON.parse(init.body), init.headers['x-beta-session'], 'browser')
    return { ok: res.status < 400, status: res.status, json: async () => res.body }
  }
  const store = createSupabaseStore('https://x.supabase.co/rest/v1/', 'key', fetchImpl)
  await assert.rejects(() => store.joinPlayer('A', 'NOPE', 'Asha'), /team code/)
  const p = await store.joinPlayer('A', 'PURPLE', 'Asha')
  assert.equal(typeof p.joinedAt, 'number')
  let s = store.getState()
  assert.equal(s.me.role, 'player'); assert.equal(s.me.teamId, 'A'); assert.equal(Object.values(s.players)[0].name, 'Asha')
  await store.dispatch({ type: 'teamField', team: 'A', mission: 'chaos', key: 'x', value: 7 })
  assert.equal(store.getState().teams.A.progress.chaos.x, 7)
  await store.logout()
  assert.equal(store.getState().me, null)
  assert.equal(normalize({ event: {}, reveal: null }).event.roundSeconds, 420)
})
