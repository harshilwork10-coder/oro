'use client'

import { useState } from 'react'
import { RotateCcw, ShoppingCart, FileText, CalendarPlus, ChevronDown, CreditCard, Banknote, Scissors, Loader2 } from 'lucide-react'
import type { CustomerVisit } from '@/types/customer'

interface Props {
  visits: CustomerVisit[]
  loading: boolean
  onRepeatVisit: (visitId: string) => void
  onAddService: (service: { id: string; name: string; price: number; type: string }) => void
}

export default function VisitHistorySection({ visits, loading, onRepeatVisit, onAddService }: Props) {
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? visits : visits.slice(0, 5)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--theme-accent)] animate-spin" />
      </div>
    )
  }

  if (visits.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mx-auto mb-3">
          <FileText className="w-7 h-7 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">No visit history available</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {displayed.map(visit => (
        <div key={visit.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden border-l-[3px] border-l-[var(--theme-accent-muted)] hover:border-l-[var(--theme-accent)] transition-colors">
          {/* Visit Header */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                📅 {visit.date ? new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' }) : 'Unknown date'}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {visit.stylist !== 'N/A' && (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Scissors className="w-3 h-3" /> {visit.stylist}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  {visit.paymentMethod === 'CASH' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                  {visit.paymentMethod}
                </span>
              </div>
            </div>
            <span className="text-base font-bold text-[var(--theme-accent)]">
              ${visit.total.toFixed(2)}
            </span>
          </div>

          {/* Services */}
          <div className="border-t border-[var(--border)]">
            {visit.services.map((svc, i) => (
              <div key={svc.id || i} className="flex items-center justify-between px-4 py-1.5 text-sm group hover:bg-[var(--surface2)]/30 transition-colors">
                <span className="text-[var(--text-secondary)]">• {svc.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">${svc.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {visit.notes && (
            <div className="px-4 py-2 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-muted)] italic">💬 &ldquo;{visit.notes}&rdquo;</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface2)]/20">
            <button
              onClick={() => onRepeatVisit(visit.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Repeat Visit
            </button>
            <button
              onClick={() => visit.services.forEach(svc => onAddService({ id: svc.id, name: svc.name, price: svc.price, type: svc.type }))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <ShoppingCart className="w-3 h-3" />
              Add Services
            </button>
          </div>
        </div>
      ))}

      {/* Show More */}
      {visits.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] hover:text-[var(--text-secondary)] hover:border-[var(--theme-accent)]/20 transition-all flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Show All {visits.length} Visits
        </button>
      )}
    </div>
  )
}
