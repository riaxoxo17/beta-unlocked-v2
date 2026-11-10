import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TEAMS, COUNTDOWN_SECONDS } from '../lib/config.js'
import { useGame } from '../lib/useGame.jsx'
import { useNow } from '../lib/time.js'
import { sfx } from '../lib/audio.js'
import { Symbol } from './ui.jsx'
import { DoorArt } from './art.jsx'

export function Door({ team, open, name, mine, big, status }) {
  const w = big ? 190 : 140
  return (
    <div style={{ textAlign: 'center', width: w }}>
      <DoorArt color={team.color} number={team.door} open={open} width={w} />
      <div style={{ marginTop: 8, minHeight: 44 }}>
        {open && name ? (
          <div className="pixel" style={{ fontSize: big ? 28 : 22, color: team.color, fontWeight: 700 }}>
            {name}
          </div>
        ) : (
          <div className="hint" style={{ fontSize: big ? 16 : 13 }}>
            {mine ? `Your door (${team.colorName})` : team.colorName}
          </div>
        )}
        {status && !open && (
          <div className="chip" style={{ marginTop: 6, '--c': team.color }}>
            {STATUS_TEXT[status]}
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_TEXT = { clue: 'Reading the clue', countdown: 'Countdown running', name: 'Name revealed to team', done: 'Name revealed to team' }

export function VaultDoors({ big, myTeam }) {
  const { state } = useGame()
  const revealed = state.revealed || {}
  const status = state.revealStatus || {}
  return (
    <div style={{ display: 'flex', gap: big ? 36 : 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      {TEAMS.map((t) => (
        <Door key={t.id} team={t} big={big} open={!!revealed[t.id]} name={revealed[t.id]?.name} mine={myTeam === t.id} status={status[t.id]} />
      ))}
    </div>
  )
}

function Confetti({ color }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 300,
        dur: 2.2 + Math.random() * 2.4,
        delay: Math.random() * 0.8,
        c: ['#fff', color, '#fbbf24', '#a855f7', '#2dd4bf'][i % 5],
      })),
    [color],
  )
  return bits.map((b, i) => (
    <span key={i} className="confetti" style={{ left: b.left + 'vw', '--dx': b.dx + 'px', animationDuration: b.dur + 's', animationDelay: b.delay + 's', background: b.c }} />
  ))
}

// Full-screen reveal for the viewer's own team. Their facilitator drives it; other teams never see it.
export function RevealOverlay() {
  const { state } = useGame()
  const [dismissed, setDismissed] = useState(null)
  const rv = state.reveal || {}
  const active = !!(rv.team && rv.stage) && dismissed !== rv.team + rv.startedAt
  const team = TEAMS.find((t) => t.id === rv.team)
  const payload = state.reveal
  const now = useNow(100)
  const lastTick = useRef(null)
  const fanfared = useRef(null)

  const n = Math.max(0, COUNTDOWN_SECONDS - Math.floor((now - rv.startedAt) / 1000))
  useEffect(() => {
    if (active && rv.stage === 'countdown' && lastTick.current !== n) {
      lastTick.current = n
      sfx.tick()
    }
  }, [n, active, rv.stage])
  useEffect(() => {
    const key = rv.team + rv.startedAt
    if (active && rv.stage === 'name' && payload?.name && fanfared.current !== key) {
      fanfared.current = key
      sfx.fanfare()
    }
  }, [active, rv.stage, payload, rv.team, rv.startedAt])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={rv.team}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            textAlign: 'center',
            background: `radial-gradient(900px 600px at 50% 40%, ${team.color}55, #05050c 70%), #05050c`,
            color: '#fff',
          }}
        >
          <div style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, color: team.color }}>
              <Symbol kind={team.symbol} size={40} color={team.color} />
              <span className="pixel" style={{ fontSize: 28, fontWeight: 700 }}>
                Door {String(team.door).padStart(2, '0')}
              </span>
            </div>
            {rv.stage === 'clue' && (
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 44px)', lineHeight: 1.25, marginTop: 28 }}>
                {payload?.clue || '…'}
              </motion.p>
            )}
            {rv.stage === 'countdown' && (
              <motion.div key={n} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pixel" style={{ fontSize: 'clamp(120px, 28vw, 300px)', fontWeight: 700, lineHeight: 1, marginTop: 10 }}>
                {n || '!'}
              </motion.div>
            )}
            {rv.stage === 'name' && (
              <>
                <Confetti color={team.color} />
                <motion.h1
                  initial={{ scale: 0.4, opacity: 0, filter: 'blur(14px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', damping: 12 }}
                  style={{ fontSize: 'clamp(56px, 13vw, 170px)', marginTop: 20, textShadow: `0 0 50px ${team.color}` }}
                >
                  {payload?.name || '…'}
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ fontSize: 'clamp(18px, 3vw, 32px)', marginTop: 18 }}>
                  {payload?.tagline}
                </motion.p>
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="btn btn-ghost" style={{ marginTop: 30 }} onClick={() => setDismissed(rv.team + rv.startedAt)}>
                  Continue
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// The finale: all four names at once, on every screen, when the Game Master turns it on.
export function FinalReveal() {
  const { state } = useGame()
  const on = !!state.final
  const fanfared = useRef(false)
  useEffect(() => {
    if (on && !fanfared.current) {
      fanfared.current = true
      sfx.fanfare()
    }
    if (!on) fanfared.current = false
  }, [on])
  const revealed = state.revealed || {}
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-live="polite"
          aria-label="The four Betas"
          style={{ position: 'fixed', inset: 0, zIndex: 70, overflowY: 'auto', background: 'radial-gradient(1000px 700px at 50% 20%, #2b1a55, #05050c 70%), #05050c', color: '#fff', display: 'grid', placeItems: 'center', padding: '28px 16px', textAlign: 'center' }}
        >
          <Confetti color="#a855f7" />
          <div>
            <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pixel" style={{ fontSize: 'clamp(28px, 6vw, 64px)', marginBottom: 24 }}>
              Meet the four Bettas
            </motion.h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(14px, 3vw, 40px)' }}>
              {TEAMS.map((t, i) => (
                <motion.div key={t.id} initial={{ y: 40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.35, type: 'spring', damping: 13 }} style={{ width: 'clamp(130px, 21vw, 230px)' }}>
                  <DoorArt color={t.color} number={t.door} open width="100%" />
                  <div className="pixel" style={{ fontSize: 'clamp(22px, 3.4vw, 40px)', fontWeight: 700, color: t.color, marginTop: 8 }}>
                    {revealed[t.id]?.name || '…'}
                  </div>
                  <div style={{ fontSize: 'clamp(12px, 1.4vw, 17px)', color: '#cfcde6', marginTop: 4 }}>{revealed[t.id]?.tagline}</div>
                  <div className="hint" style={{ marginTop: 4 }}>{t.name}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
