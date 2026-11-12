// The only place that knows the database. Every method is one call to a SQL function in schema.sql,
// so the same code runs against Supabase (rpc) and, in tests, against a local Postgres.
export type Rpc = (fn: string, params: Record<string, unknown>) => Promise<any>

export function createRepo(rpc: Rpc) {
  const call = (fn: string, p: Record<string, unknown> = {}) => rpc(fn, { p })
  return {
    getEvent: () => call('api_get_event'),
    patchEvent: (patch: unknown) => call('api_patch_event', { patch }),
    setReveal: (path: string[], value: unknown) => call('api_set_reveal', { path, value }),
    setTeamRun: (team: string, run: unknown) => call('api_set_team_run', { team, run }),
    getTeams: (team?: string) => call('api_get_teams', team ? { team } : {}),
    patchTeamField: (team: string, mission: string, key: string, value: unknown) => call('api_patch_team_field', { team, mission, key, value }),
    resetMission: (team: string, mission: string) => call('api_reset_mission', { team, mission }),
    setHint: (team: string, hint: unknown) => call('api_set_hint', { team, hint }),
    listPlayers: (team?: string) => call('api_list_players', team ? { team } : {}),
    joinPlayer: (team: string, name: string) => call('api_join_player', { team, name }),
    removePlayer: (id: string) => call('api_remove_player', { id }),
    resetProgress: () => call('api_reset_progress'),
    resetAll: () => call('api_reset_all'),
    createSession: (row: Record<string, unknown>) => call('api_create_session', row),
    findSession: (tokenHash: string) => call('api_find_session', { token_hash: tokenHash }),
    deleteSession: (tokenHash: string) => call('api_delete_session', { token_hash: tokenHash }),
    listFacilitators: () => call('api_list_facilitators'),
    upsertFacilitator: (team: string, name: string, codeHash: string) => call('api_upsert_facilitator', { team, name, code_hash: codeHash }),
    findFacilitator: (codeHash: string) => call('api_find_facilitator', { code_hash: codeHash }),
    getVault: () => call('api_get_vault'),
    setVault: (team: string, patch: Record<string, unknown>) => call('api_set_vault', { team, patch }),
    attempt: (key: string, limit: number, windowSeconds: number, delta: 0 | 1) => call('api_bump_attempt', { key, limit, window_seconds: windowSeconds, delta }),
    clearAttempt: (key: string) => call('api_clear_attempt', { key }),
  }
}
export type Repo = ReturnType<typeof createRepo>
