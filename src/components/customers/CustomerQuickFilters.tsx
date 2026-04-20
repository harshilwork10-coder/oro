'use client'

import type { CustomerTag } from '@/types/customer'

const FILTER_OPTIONS: { label: string; value: CustomerTag | null }[] = [
  { label: 'All', value: null },
  { label: 'VIP', value: 'VIP' },
  { label: 'New', value: 'New' },
  { label: 'At-Risk', value: 'At-Risk' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'High Spender', value: 'High Spender' },
  { label: 'Reward Ready', value: 'Reward Ready' },
]

interface Props {
  activeFilter: CustomerTag | null
  onFilterChange: (filter: CustomerTag | null) => void
  counts?: Record<string, number>
}

export default function CustomerQuickFilters({ activeFilter, onFilterChange, counts }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide px-1">
      {FILTER_OPTIONS.map(opt => {
        const isActive = activeFilter === opt.value
        const count = opt.value === null
          ? counts?.all
          : counts?.[opt.value || '']
        return (
          <button
            key={opt.label}
            onClick={() => onFilterChange(opt.value)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-180
              ${isActive
                ? 'bg-[var(--theme-accent)] text-black shadow-[0_0_12px_var(--theme-accent-muted)]'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text-secondary)] border border-[var(--border)]'
              }
            `}
          >
            {opt.label}
            {count !== undefined && (
              <span className={`ml-1 ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
