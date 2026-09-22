import type { Bar } from 'oakscriptjs/script'

export interface EodhdDailyBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  adjusted_close: number
  volume: number
}

export function toOakBars(raw: EodhdDailyBar[]): Bar[] {
  return raw.map((r) => ({
    time: Math.floor(new Date(`${r.date}T00:00:00Z`).getTime() / 1000),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }))
}
