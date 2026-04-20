'use client'

import { useState } from 'react'
import { RotateCcw, History, Star, StickyNote, Settings, Users, X } from 'lucide-react'
import ProfileHeaderCard from './ProfileHeaderCard'
import QuickRepeatSection from './QuickRepeatSection'
import VisitHistorySection from './VisitHistorySection'
import LoyaltySection from './LoyaltySection'
import NotesPreferencesSection from './NotesPreferencesSection'
import CustomerDetailsSection from './CustomerDetailsSection'
import type { CustomerProfile, ProfileTab, CustomerVisit } from '@/types/customer'

interface Props {
  profile: CustomerProfile | null
  profileLoading: boolean
  visits: CustomerVisit[]
  visitsLoading: boolean
  onEditProfile: () => void
  onAttachToCart: () => void
  onRepeatLastVisit: () => void
  onAddFavorite: () => void
  onAddService: (service: { id: string; name: string; price: number; type: string }) => void
  onRepeatVisit: (visitId: string) => void
  onSaveProfile: (data: any) => Promise<boolean>
  onDeleteCustomer: () => void
  onEnrollLoyalty: () => void
  onClose?: () => void
}

const TABS: { id: ProfileTab; label: string; icon: any }[] = [
  { id: 'quick-repeat', label: 'Quick Repeat', icon: RotateCcw },
  { id: 'history', label: 'History', icon: History },
  { id: 'loyalty', label: 'Loyalty', icon: Star },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'details', label: 'Details', icon: Settings },
]

export default function CustomerProfilePanel({
  profile, profileLoading, visits, visitsLoading,
  onEditProfile, onAttachToCart, onRepeatLastVisit, onAddFavorite,
  onAddService, onRepeatVisit, onSaveProfile, onDeleteCustomer,
  onEnrollLoyalty, onClose
}: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('quick-repeat')
  const [isEditing, setIsEditing] = useState(false)

  // Empty state when no customer selected
  if (!profile && !profileLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--background)]">
        <div className="w-20 h-20 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Select a Customer</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Choose a customer from the list to view their profile, service history, and start selling
        </p>
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  // Build quick repeat data from visits
  const lastVisit = visits.length > 0 ? visits[0] : null

  // Compute top repeated services from visit history
  const serviceFrequency: Record<string, { name: string; count: number; lastPrice: number }> = {}
  visits.forEach(v => {
    v.services.forEach(svc => {
      const key = svc.name.toLowerCase()
      if (!serviceFrequency[key]) {
        serviceFrequency[key] = { name: svc.name, count: 0, lastPrice: svc.price }
      }
      serviceFrequency[key].count++
      serviceFrequency[key].lastPrice = svc.price
    })
  })
  const topServices = Object.entries(serviceFrequency)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([, val]) => ({
      serviceId: val.name.toLowerCase().replace(/\s+/g, '-'),
      serviceName: val.name,
      repeatCount: val.count,
      lastPrice: val.lastPrice,
    }))

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] overflow-hidden animate-fade-in">
      {/* Close button on mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header Card — Fixed */}
      <ProfileHeaderCard
        profile={profile}
        onEditProfile={() => { setActiveTab('details'); setIsEditing(true) }}
        onAttachToCart={onAttachToCart}
        onRepeatLastVisit={onRepeatLastVisit}
        onAddFavorite={onAddFavorite}
        onContact={() => {}}
      />

      {/* Tab Bar */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface)] px-1 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all relative
                ${isActive
                  ? 'text-[var(--theme-accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-[var(--theme-accent)] shadow-[0_-2px_8px_var(--theme-accent-muted)]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content — Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'quick-repeat' && (
          <QuickRepeatSection
            lastVisit={lastVisit}
            topServices={topServices}
            onAddService={onAddService}
            onRepeatVisit={onRepeatVisit}
            loading={visitsLoading}
          />
        )}
        {activeTab === 'history' && (
          <VisitHistorySection
            visits={visits}
            loading={visitsLoading}
            onRepeatVisit={onRepeatVisit}
            onAddService={onAddService}
          />
        )}
        {activeTab === 'loyalty' && (
          <LoyaltySection
            loyalty={profile.loyalty}
            customerName={profile.name}
            onEnroll={onEnrollLoyalty}
          />
        )}
        {activeTab === 'notes' && (
          <NotesPreferencesSection
            preferences={profile.preferences}
          />
        )}
        {activeTab === 'details' && (
          <CustomerDetailsSection
            profile={profile}
            onSave={onSaveProfile}
            onDelete={onDeleteCustomer}
            isEditMode={isEditing}
            setIsEditMode={setIsEditing}
          />
        )}
      </div>
    </div>
  )
}
