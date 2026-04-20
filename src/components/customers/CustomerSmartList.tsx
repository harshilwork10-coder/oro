'use client'

import { Search, UserPlus, Loader2, Users } from 'lucide-react'
import CustomerSmartRow from './CustomerSmartRow'
import CustomerQuickFilters from './CustomerQuickFilters'
import type { SmartCustomerRow, CustomerTag } from '@/types/customer'

interface Props {
  customers: SmartCustomerRow[]
  loading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  activeFilter: CustomerTag | null
  onFilterChange: (f: CustomerTag | null) => void
  selectedId: string | null
  onSelectCustomer: (id: string) => void
  onRepeatLastVisit?: (customer: SmartCustomerRow) => void
  onAddToCart?: (customer: SmartCustomerRow) => void
  onEditCustomer?: (customer: SmartCustomerRow) => void
  onAddNew: () => void
  totalCount: number
}

export default function CustomerSmartList({
  customers, loading, searchQuery, onSearchChange,
  activeFilter, onFilterChange,
  selectedId, onSelectCustomer,
  onRepeatLastVisit, onAddToCart, onEditCustomer,
  onAddNew, totalCount
}: Props) {
  return (
    <div className="flex flex-col h-full bg-[var(--background)] border-r border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--theme-accent)]" />
          <h2 className="font-bold text-[var(--text-primary)] text-base">Customers</h2>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded-md">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--theme-accent)] text-black hover:brightness-110 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search name, phone, service..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--theme-accent)]/30 focus:border-[var(--theme-accent)]/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="px-3 pb-2">
        <CustomerQuickFilters
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[var(--theme-accent)] animate-spin" />
            <p className="text-xs text-[var(--text-muted)] mt-2">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </p>
            {searchQuery && (
              <button
                onClick={onAddNew}
                className="mt-3 text-sm font-medium text-[var(--theme-accent)] hover:underline"
              >
                Create &ldquo;{searchQuery}&rdquo; →
              </button>
            )}
          </div>
        ) : (
          customers.map(customer => (
            <CustomerSmartRow
              key={customer.id}
              customer={customer}
              isSelected={selectedId === customer.id}
              onSelect={() => onSelectCustomer(customer.id)}
              onRepeat={onRepeatLastVisit ? () => onRepeatLastVisit(customer) : undefined}
              onAddToCart={onAddToCart ? () => onAddToCart(customer) : undefined}
              onEdit={onEditCustomer ? () => onEditCustomer(customer) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
