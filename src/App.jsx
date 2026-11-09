import { lazy, Suspense } from 'react'
import { GameProvider } from './lib/useGame.jsx'
import { useHash } from './lib/router.js'
import Join from './pages/Join.jsx'
import Play from './pages/Play.jsx'
import Screen from './pages/Screen.jsx'
import Facilitator from './pages/Facilitator.jsx'

const GM = lazy(() => import('./pages/GM.jsx'))

export default function App() {
  const { path } = useHash()
  return (
    <GameProvider>
      {path === '/play' ? <Play /> : path === '/screen' ? <Screen /> : path === '/facilitator' ? <Facilitator /> : path === '/gm' ? (
        <Suspense fallback={<div className="stage" data-room="hq" />}>
          <GM />
        </Suspense>
      ) : (
        <Join />
      )}
    </GameProvider>
  )
}
