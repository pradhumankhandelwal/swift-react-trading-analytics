// Port of Pine Script v6 indicator "3 Simple Moving Averages" (3SMAs) to
// oakscriptJS's Script API (see oakscriptjs/script guide.md).
import { executeScript, indicator, input, plot, ta } from 'oakscriptjs/script'
import type { Bar, ScriptRunResult } from 'oakscriptjs/script'

function threeSmasScript() {
  indicator('3 Simple Moving Averages', { shorttitle: '3SMAs', overlay: true })

  const sma1Length = input.int(20, 'SMA 20', { minval: 1 })
  const sma1Source = input.source('close', 'SMA Source 20')
  // Pine's plot.linestyle_dotted has no equivalent on plot() here (only hline
  // exposes a dash `linestyle`), so plots render as solid lines.
  plot(ta.sma(sma1Source, sma1Length), 'SMA 20', { color: '#00FF00', linewidth: 2 })

  const sma2Length = input.int(50, 'SMA 50', { minval: 1 })
  const sma2Source = input.source('close', 'SMA Source 50')
  plot(ta.sma(sma2Source, sma2Length), 'SMA 50', { color: '#FF0000', linewidth: 2 })

  const sma3Length = input.int(200, 'SMA 200', { minval: 1 })
  const sma3Source = input.source('close', 'SMA Source 200')
  plot(ta.sma(sma3Source, sma3Length), 'SMA 200', { color: '#E0E0E0', linewidth: 2 })
}

export function calculateThreeSmas(
  bars: Bar[],
  inputs?: Record<string, unknown>,
): ScriptRunResult {
  return executeScript(threeSmasScript, bars, inputs)
}
