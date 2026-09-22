import { NAV_TABS } from './types'
import type { View } from './types'

interface BottomNavProps {
  active: View
  onChange: (view: View) => void
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_TABS.map((tab) => {
        const isActive = tab.view === active
        return (
          <button
            key={tab.view}
            type="button"
            className="bottom-nav-tab"
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive}
            onClick={() => onChange(tab.view)}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
