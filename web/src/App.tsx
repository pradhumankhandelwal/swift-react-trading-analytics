import { useCallback, useEffect, useState } from 'react'
import { getDeviceInfo, isNative, type DeviceInfo } from './native'
import MarketOverview from './MarketOverview'

export default function App() {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const native = isNative()

  const askNative = useCallback(async function askNative() {
    setBusy(true)
    setError(null)
    try {
      setInfo(await getDeviceInfo())
    } catch (e) {
      setInfo(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  // Populate on first render so the bridge round trip is visible without a tap.
  useEffect(() => {
    if (native) void askNative()
  }, [native, askNative])

  return (
    <main className="app">
      <h1>Watchlist</h1>

      {error && <p className="error">{error}</p>}

      <MarketOverview />
    </main>
  )
}
