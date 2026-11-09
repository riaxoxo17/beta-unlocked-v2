import { createLocalStore } from './local.js'
import { createSupabaseStore } from './supabase.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// No Supabase settings: rehearsal mode (everything stays in this browser).
export const store = url && key ? createSupabaseStore(url, key) : createLocalStore()
