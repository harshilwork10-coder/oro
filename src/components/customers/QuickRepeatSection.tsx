'use client'

import { RotateCcw, Plus, ShoppingCart, Sparkles, Calendar } from 'lucide-react'
import type { CustomerVisit, TopRepeatedService } from '@/types/customer'

interface Props {
  lastVisit: CustomerVisit | null
  topServices: TopRepeatedService[]
  onAddService: (service: { id: string; name: string; price: number; type: string }) => void
  onRepeatVisit: (visitId: string) => void
  loading?: boolean
}

export default function QuickRepeatSection({ lastVisit, topServices, onAddService, onRepeatVisit, loading }: Props) {
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Last Visit */}
      {lastVisit ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Last Visit · {lastVisit.dateRelative}
            </h3>
            <span className="text-[10px] text-[var(--text-muted)]">
              {lastVisit.stylist !== 'N/A' && `Stylist: ${lastVisit.stylist}`}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {lastVisit.services.map((svc, i) => (
              <div key={svc.id || i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 group hover:bg-[var(--surface2)]/50 transition-colors">
                <div>
                  <span className="text-sm text-[var(--text-primary)] font-medium">{svc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">${svc.price.toFixed(2)}</span>
                  <button
                    onClick={() => onAddService({ id: svc.id, name: svc.name, price: svc.price, type: svc.type || 'SERVICE' })}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-accent)]/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            ))}

            {/* Total + Repeat All */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface2)]/30">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Total: <span className="text-[var(--theme-accent)]">${lastVisit.total.toFixed(2)}</span>
              </span>
              <button
                onClick={() => onRepeatVisit(lastVisit.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Add All to Cart
              </button>
            </div>
          </div>

          {/* Notes from last visit */}
          {lastVisit.notes && (
            <div className="mt-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
              <span className="text-xs text-[var(--text-muted)] italic">&ldquo;{lastVisit.notes}&rdquo;</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mx-auto mb-2">
            <ShoppingCart className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No visit history yet</p>
        </div>
      )}

      {/* Top Repeated Services */}
      {topServices.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Top Repeated Services
          </h3>

          <div className="space-y-1.5">
            {topServices.map((svc, i) => (
              <div key={svc.serviceId || i} className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl group hover:bg-[var(--surface2)]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-sm text-[var(--text-primary)] font-medium">{svc.serviceName}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-2">{svc.repeatCount}× booked</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">${svc.lastPrice.toFixed(2)}</span>
                  <button
                    onClick={() => onAddService({ id: svc.serviceId, name: svc.serviceName, price: svc.lastPrice, type: 'SERVICE' })}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20 hover:bg-[var(--theme-accent)]/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
