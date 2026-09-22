import { useCallback, useEffect, useState } from 'react'
import { isNative} from './native'
import MarketOverview from './screens/MarketOverview'
import IndicatorsView from './screens/IndicatorsView'
import BottomNav from './nav/BottomNav'
import type { View } from './nav/types'

export default function App() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('watchlist')

  const native = isNative()

  const askNative = useCallback(async function askNative() {
    setBusy(true)
    setError(null)
  }, [])

  // Populate on first render so the bridge round trip is visible without a tap.
  useEffect(() => {
    if (native) void askNative()
  }, [native, askNative])

  return (
    <>
      <main className="app">
        {view === 'watchlist' && (
          <>
            <h1>Watchlist</h1>
            {error && <p className="error">{error}</p>}
            <MarketOverview />
          </>
        )}

        {view === 'indicators' && <IndicatorsView />}
      </main>

      <BottomNav active={view} onChange={setView} />
    </>
  )
}
