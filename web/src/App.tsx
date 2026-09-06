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
      <h1>Hello World from React</h1>
      <p className="subtitle">
        Rendered in a WKWebView hosted by a native Swift app.
      </p>

      <p className={`badge ${native ? 'badge-native' : 'badge-browser'}`}>
        {native ? 'native bridge detected' : 'browser (no native bridge)'}
      </p>

      <button onClick={askNative} disabled={!native || busy}>
        {busy ? 'Asking Swift…' : info ? 'Refresh device info' : 'Ask Swift for device info'}
      </button>

      {info && (
        <dl className="info">
          <dt>Model</dt>
          <dd>{info.model}</dd>
          <dt>System</dt>
          <dd>
            {info.systemName} {info.systemVersion}
          </dd>
          <dt>App version</dt>
          <dd>{info.appVersion}</dd>
        </dl>
      )}

      {error && <p className="error">{error}</p>}

      <MarketOverview />
    </main>
  )
}
