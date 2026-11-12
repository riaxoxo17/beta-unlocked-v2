import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { store } from './store/index.js'
import { STEPS } from './config.js'
import { currentRound, roleFor, roomFor, teamPlayers, stepOf } from './game.js'
import { nav } from './router.js'

const Ctx = createContext(null)

export function GameProvider({ children }) {
  const [state, setState] = useState(() => store.getState())
  useEffect(() => {
    setState(store.getState())
    return store.subscribe(setState)
  }, [])

  const join = useCallback((team, code, name) => store.joinPlayer(team, code, name), [])
  const leave = useCallback(async () => {
    await store.logout()
    nav('/')
  }, [])
  const dispatch = useCallback((op) => store.dispatch(op), [])

  const value = useMemo(() => {
    const ev = state.event
    const auth0 = state.me?.role || null
    const myTeam = auth0 === 'player' ? state.players[state.me.playerId]?.team || null : auth0 === 'facilitator' ? state.me.teamId : null
    const myStep = stepOf(ev, myTeam)
    const stepInfo = STEPS[Math.min(myStep, STEPS.length - 1)]
    const auth = state.me?.role || null
    const me = auth === 'player' ? state.players[state.me.playerId] || null : null
    const teamId = me?.team || null
    const players = teamId ? teamPlayers(state, teamId) : []
    const myIdx = me ? players.findIndex((p) => p.id === me.id) : -1
    const round = currentRound(myStep)
    return {
      state,
      ev,
      stepInfo,
      myStep,
      myTeam,
      auth,
      me,
      teamId,
      players,
      myIdx,
      round,
      role: me ? roleFor(myIdx, round) : null,
      room: teamId && stepInfo.phase === 'round' ? roomFor(teamId, stepInfo.round) : null,
      nextRoom: teamId && stepInfo.phase === 'transition' ? roomFor(teamId, stepInfo.round + 1) : null,
      dispatch,
      join,
      leave,
      setField: (mission, key, val) => store.dispatch({ type: 'teamField', team: teamId, mission, key, value: val }),
      setHint: (team, hint) => store.dispatch({ type: 'teamHint', team, hint }),
    }
  }, [state, dispatch, join, leave])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame must be used inside GameProvider.')
  return c
}

// Shared state of one mission for the player's own team.
export function useMission(mission) {
  const g = useGame()
  const p = g.state.teams[g.teamId]?.progress[mission] || {}
  return { ...g, p, set: (k, v) => g.setField(mission, k, v) }
}
