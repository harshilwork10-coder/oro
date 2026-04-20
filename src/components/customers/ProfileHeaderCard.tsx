'use client'

import { Phone, Mail, Cake, Star, CalendarDays, Scissors, Pencil, ShoppingBag, RotateCcw, Heart, CalendarPlus, UserCheck, MessageCircle } from 'lucide-react'
import CustomerTagBadge from './CustomerTagBadge'
import type { CustomerProfile } from '@/types/customer'

interface Props {
  profile: CustomerProfile
  onEditProfile: () => void
  onAttachToCart: () => void
  onRepeatLastVisit: () => void
  onAddFavorite: () => void
  onBookAppointment?: () => void
  onCheckIn?: () => void
  onContact?: () => void
}

export default function ProfileHeaderCard({
  profile, onEditProfile, onAttachToCart, onRepeatLastVisit,
  onAddFavorite, onBookAppointment, onCheckIn, onContact
}: Props) {
  const formatCurrency = (n: number) => `$${n.toFixed(2)}`

  return (
    <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4 space-y-4">
      {/* Identity Row */}
      <div className="flex items-start gap-4">
        {/* Large avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--theme-accent)]/25 to-[var(--theme-accent-dark)]/25 flex items-center justify-center flex-shrink-0 border border-[var(--theme-accent)]/20">
          <span className="text-[var(--theme-accent)] text-xl font-bold">
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{profile.name}</h2>
            {profile.tags.slice(0, 3).map(tag => (
              <CustomerTagBadge key={tag} tag={tag} />
            ))}
          </div>

          {/* Contact details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {profile.phone && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {profile.phone}
              </span>
            )}
            {profile.email && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {profile.email}
              </span>
            )}
            {profile.birthday && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Cake className="w-3.5 h-3.5 text-pink-400" />
                {new Date(profile.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Meta line */}
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Member since {profile.memberSince}
            </span>
            {profile.preferredStylist && (
              <span className="flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {profile.preferredStylist}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Points', value: profile.loyaltyPoints.toLocaleString(), icon: Star, accent: true },
          { label: 'Visits', value: profile.totalVisits.toString(), icon: null, accent: false },
          { label: 'Lifetime', value: formatCurrency(profile.lifetimeSpend), icon: null, accent: false },
          { label: 'Avg Ticket', value: formatCurrency(profile.averageTicket), icon: null, accent: false },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--surface2)]/50 border border-[var(--border)] rounded-xl p-2.5 text-center">
            <div className={`text-lg font-black ${stat.accent ? 'text-[var(--theme-accent)]' : 'text-[var(--text-primary)]'}`}>
              {stat.icon && <stat.icon className="w-3.5 h-3.5 inline mr-1 mb-0.5" />}
              {stat.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Last visit date callout */}
      {profile.lastVisitRelative !== 'Never' && (
        <div className="text-xs text-[var(--text-muted)] px-1">
          Last visit: <span className="text-[var(--text-secondary)] font-medium">{profile.lastVisitRelative}</span>
          {profile.lastVisitDate && (
            <span> · {new Date(profile.lastVisitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Primary row */}
        <button onClick={onEditProfile} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--surface2)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--theme-accent)]/30 hover:text-[var(--text-primary)] transition-all">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={onAttachToCart} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--theme-accent)] text-black hover:brightness-110 transition-all">
          <ShoppingBag className="w-3.5 h-3.5" /> Attach to Cart
        </button>
        <button onClick={onRepeatLastVisit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Repeat Last
        </button>
        <button onClick={onAddFavorite} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--surface2)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-pink-500/30 hover:text-pink-400 transition-all">
          <Heart className="w-3.5 h-3.5" /> Favorite
        </button>
        {onBookAppointment && (
          <button onClick={onBookAppointment} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--surface2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-all">
            <CalendarPlus className="w-3.5 h-3.5" /> Book
          </button>
        )}
        {onCheckIn && (
          <button onClick={onCheckIn} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--surface2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-all">
            <UserCheck className="w-3.5 h-3.5" /> Check In
          </button>
        )}
        {onContact && profile.phone && (
          <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--surface2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-all">
            <MessageCircle className="w-3.5 h-3.5" /> Call
          </a>
        )}
      </div>
    </div>
  )
}
