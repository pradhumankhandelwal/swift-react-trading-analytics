import { useEffect, useRef } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'tv-market-overview': {
        ref?: React.Ref<HTMLElement>
        'symbol-sectors'?: string
        'time-frame'?: string
      }
    }
  }
}

const SYMBOL_SECTORS = [
  {
    sectionName: 'Indices',
    symbols: ['FOREXCOM:SPXUSD', 'FOREXCOM:NSXUSD', 'FOREXCOM:DJI', 'FOREXCOM:UKXGBP'],
  },
  {
    sectionName: 'Stocks',
    symbols: ['NASDAQ:AAPL', 'NASDAQ:ADBE', 'NASDAQ:NVDA', 'NASDAQ:TSLA'],
  },
  {
    sectionName: 'Crypto',
    symbols: ['BITSTAMP:BTCUSD', 'BITSTAMP:ETHUSD', 'CRYPTO:XRPUSD'],
  },
  {
    sectionName: 'india',
    symbols: ['BITSTAMP:BTCUSD', 'BITSTAMP:ETHUSD', 'CRYPTO:XRPUSD'],
  },
  {
    sectionName: 'australia',
    symbols: ['BITSTAMP:BTCUSD', 'BITSTAMP:ETHUSD', 'CRYPTO:XRPUSD'],
  },
]

// The <tv-market-overview> widget renders a price chart and a time-frame selector
// above its ticker list, with no attribute to disable either. Both live in the
// widget's shadow root, so hide them by injecting a stylesheet into that root once
// the element upgrades (index.html forces the shadow root open).
const HIDE_CSS =
  '.chart-area{display:none!important}tv-option-bar[variant=square]{display:none!important}'

function hideChart(el: HTMLElement): boolean {
  const root = el.shadowRoot
  if (!root) return false
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(HIDE_CSS)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
  } catch {
    const style = document.createElement('style')
    style.textContent = HIDE_CSS
    root.appendChild(style)
  }
  return true
}

export default function MarketOverview() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    let cancelled = false
    const attempt = () => {
      if (cancelled || hideChart(el)) return
      timer = window.setTimeout(attempt, 50)
    }
    attempt()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <section className="market">
      <tv-market-overview
        ref={ref}
        symbol-sectors={JSON.stringify(SYMBOL_SECTORS)}
        time-frame="YTD"
      />
    </section>
  )
}
