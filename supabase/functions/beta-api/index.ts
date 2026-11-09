// Supabase Edge Function: the only door into the BETA: UNLOCKED database.
// Secrets needed (supabase secrets set ...): BETA_GM_PASSCODE. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHandler } from './handler.ts'
import { createRepo } from './repo.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const repo = createRepo(async (fn, params) => {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) throw new Error(error.message)
  return data
})

const handle = createHandler(repo, { gmPasscode: Deno.env.get('BETA_GM_PASSCODE') ?? '' })

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-beta-session, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST.' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  const body = await req.json().catch(() => ({}))
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim()
  const res = await handle({ headers: { 'x-beta-session': req.headers.get('x-beta-session') ?? undefined }, body, ip })
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { ...cors, 'Content-Type': 'application/json' } })
})
