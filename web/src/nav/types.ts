export type View = 'watchlist' | 'indicators'

export interface NavTab {
  view: View
  label: string
  icon: string
}

export const NAV_TABS: NavTab[] = [
  { view: 'watchlist', label: 'Watchlist', icon: '☰' },
  { view: 'indicators', label: 'Indicators', icon: '∿' },
]
