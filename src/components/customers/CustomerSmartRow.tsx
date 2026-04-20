'use client'

import { Phone, Star, RotateCcw, ShoppingCart, Pencil, CalendarPlus } from 'lucide-react'
import CustomerTagBadge from './CustomerTagBadge'
import type { SmartCustomerRow } from '@/types/customer'

interface Props {
  customer: SmartCustomerRow
  isSelected: boolean
  onSelect: () => void
  onRepeat?: () => void
  onAddToCart?: () => void
  onEdit?: () => void
  onBook?: () => void
}

export default function CustomerSmartRow({
  customer, isSelected, onSelect, onRepeat, onAddToCart, onEdit, onBook
}: Props) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-3 rounded-xl transition-all duration-180 group relative
        ${isSelected
          ? 'bg-[var(--theme-accent-muted)] border border-[var(--theme-accent)]/40 shadow-[0_0_20px_var(--theme-accent-muted)]'
          : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--theme-accent)]/30 hover:bg-[var(--surface2)]'
        }
      `}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[var(--theme-accent)]" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`
          w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
          ${isSelected
            ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]'
            : 'bg-[var(--surface2)] text-[var(--text-secondary)]'
          }
        `}>
          {customer.initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold text-sm truncate ${isSelected ? 'text-[var(--theme-accent-light)]' : 'text-[var(--text-primary)]'}`}>
              {customer.name}
            </span>
            {customer.tags.slice(0, 2).map(tag => (
              <CustomerTagBadge key={tag} tag={tag} />
            ))}
          </div>

          {/* Phone */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">{customer.phone || 'No phone'}</span>
          </div>

          {/* Last service + date */}
          {customer.lastServiceName && (
            <div className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              Last: <span className="font-medium">{customer.lastServiceName}</span>
              {customer.lastVisitRelative !== 'Never' && (
                <span className="text-[var(--text-muted)]"> · {customer.lastVisitRelative}</span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5">
            {customer.loyaltyMember && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--theme-accent)]">
                <Star className="w-3 h-3" />
                {customer.loyaltyPoints} pts
              </span>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">
              {customer.totalVisits} visit{customer.totalVisits !== 1 ? 's' : ''}
            </span>
            {customer.preferredStylist && (
              <span className="text-[10px] text-[var(--text-muted)] truncate">
                ✂ {customer.preferredStylist}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions row — visible on hover / always visible when selected */}
      <div className={`
        flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border)] transition-all duration-200
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}>
        {onRepeat && (
          <button
            onClick={(e) => { e.stopPropagation(); onRepeat() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Repeat
          </button>
        )}
        {onAddToCart && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            <ShoppingCart className="w-3 h-3" />
            Add
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[var(--surface2)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
        {onBook && (
          <button
            onClick={(e) => { e.stopPropagation(); onBook() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[var(--surface2)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <CalendarPlus className="w-3 h-3" />
            Book
          </button>
        )}
      </div>
    </button>
  )
}
