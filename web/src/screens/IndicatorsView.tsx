import { useEffect, useRef, useState } from 'react'
import { CandlestickSeries, createChart, LineSeries } from 'lightweight-charts'
import type { IChartApi, UTCTimestamp } from 'lightweight-charts'
import { toOakBars } from '../utils/barAdapter'
import { calculateThreeSmas } from '../indicators/threeSmas'
import rawBars from '../data/symbol.json'

interface LegendEntry {
  title: string
  color: string
  value: number | null
}

export default function IndicatorsView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [legend, setLegend] = useState<LegendEntry[]>([])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      timeScale: { timeVisible: false, borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
    })
    chartRef.current = chart

    const bars = toOakBars(rawBars)
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    candles.setData(
      bars.map((b) => ({
        time: b.time as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    )

    const run = calculateThreeSmas(bars)
    const legendEntries: LegendEntry[] = run.plotConfig.map((plotCfg) => {
      const points = run.result.plots[plotCfg.id] ?? []
      const line = chart.addSeries(LineSeries, {
        color: plotCfg.color,
        lineWidth: (plotCfg.lineWidth ?? 2) as 1 | 2 | 3 | 4,
        title: plotCfg.title,
      })
      line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      return {
        title: plotCfg.title,
        color: plotCfg.color,
        value: points.length ? points[points.length - 1].value : null,
      }
    })
    setLegend(legendEntries)

    chart.timeScale().fitContent()

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [])

  return (
    <section>
      <h2>3 Simple Moving Averages</h2>
      <div ref={containerRef} className="indicator-chart" />
      <dl className="legend">
        {legend.map((entry) => (
          <div className="legend-row" key={entry.title}>
            <dt>
              <span className="legend-swatch" style={{ borderTopColor: entry.color }} />
              {entry.title}
            </dt>
            <dd>{entry.value !== null ? entry.value.toFixed(2) : '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
