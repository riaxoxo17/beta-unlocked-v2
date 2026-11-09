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
  const handler = createHandler(createRepo(rpc), { gmPasscode: 'secret-gm' })
  let n = 0
  const call = async (body, token, ip = '1.1.1.' + (n++ % 200)) =>
    handler({ headers: { 'x-beta-session': token }, body, ip })
  return { db, call }
}
const join = async (call, team, code, name) => call({ action: 'joinPlayer', teamId: team, teamCode: code, name }, undefined, 'same-wifi')

test('schema runs twice without error (idempotent)', async () => {
  const db = new PGlite()
  const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  await db.exec(sql)
  await db.exec(sql)
})

test('joining: team code, capacity of five, rejoin by name', async () => {
  const { call } = await setup()
  assert.equal((await join(call, 'A', 'WRONG', 'Asha')).status, 401)
  const first = await join(call, 'A', 'purple', 'Asha')
  assert.equal(first.status, 200)
  assert.ok(first.body.token && first.body.player.id)
  const again = await join(call, 'A', 'PURPLE', 'asha')
  assert.equal(again.body.player.id, first.body.player.id, 'same name rejoins as the same player')
  for (const n of ['Bo', 'Cy', 'Di', 'Ed']) assert.equal((await join(call, 'A', 'PURPLE', n)).status, 200)
  const sixth = await join(call, 'A', 'PURPLE', 'Fay')
  assert.equal(sixth.status, 409)
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

test('Game Master: login limits, event control, reveal never leaks early', async () => {
  const { call } = await setup()
  assert.equal((await call({ action: 'gmLogin', code: 'nope' }, undefined, '9.9.9.9')).status, 401)
  const gm = (await call({ action: 'gmLogin', code: 'secret-gm' }, undefined, '9.9.9.9')).body.token
  const a = (await join(call, 'A', 'PURPLE', 'Asha')).body
  const reveal = (r) => call({ action: 'dispatch', op: { type: 'event', patch: { reveal: r } } }, gm)
  const seeName = async () => JSON.stringify((await call({ action: 'getState' }, a.token)).body).includes('MAST')
  const pubName = async () => JSON.stringify((await call({ action: 'publicState' })).body).includes('MAST')

  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { step: 2, endsAt: 123456 } } }, gm)).status, 200)
  assert.equal((await call({ action: 'getState' }, a.token)).body.event.step, 2)
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { step: -4 } } }, gm)).status, 400)
  assert.equal((await call({ action: 'dispatch', op: { type: 'event', patch: { hacked: 1 } } }, gm)).status, 400)

  await reveal({ team: 'A', stage: 'clue', startedAt: 1000 }) // not authorised yet
  assert.equal(await seeName(), false)
  assert.equal((await call({ action: 'getState' }, a.token)).body.reveal, null, 'nothing before authorisation')
  await reveal({ authorised: true })
  const clue = (await call({ action: 'getState' }, a.token)).body.reveal
  assert.equal(clue.stage, 'clue'); assert.ok(clue.clue); assert.equal(clue.name, null)
  assert.equal(await seeName(), false); assert.equal(await pubName(), false)
  await reveal({ stage: 'countdown', startedAt: 2000 })
  assert.equal(await seeName(), false)
  await reveal({ stage: 'name' })
  assert.equal(await seeName(), true); assert.equal(await pubName(), true, 'big screen sees the name at the name stage')
  await reveal({ team: null, stage: null, done: ['A'] })
  assert.equal((await call({ action: 'getState' }, a.token)).body.revealed.A.name, 'MAST')
  await reveal({ authorised: false })
  assert.equal(await seeName(), false, 'turning authorisation off hides everything again')
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
  const vault = { A: { name: 'MAST', tagline: 't', clue: 'c', anthemUrl: 'u' }, B: { name: 'S', tagline: 't2', clue: 'c2', anthemUrl: '' } }
  for (const authorised of [true, false]) for (const stage of [null, 'clue', 'countdown', 'name']) for (const team of [null, 'A', 'B']) for (const done of [[], ['A'], ['A', 'B']]) {
    const ev = { reveal: { authorised, team, stage, startedAt: 5, done } }
    assert.deepEqual(serverDerive(ev, vault), clientDerive(ev, vault), JSON.stringify(ev))
  }
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
