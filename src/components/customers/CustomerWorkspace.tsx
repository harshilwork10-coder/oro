'use client'

import { useState, useCallback } from 'react'
import CustomerSmartList from './CustomerSmartList'
import CustomerProfilePanel from './CustomerProfilePanel'
import { useCustomerList, useCustomerProfile, useCustomerVisits } from '@/hooks/useCustomerData'
import { useToast } from '@/components/providers/ToastProvider'
import type { SmartCustomerRow } from '@/types/customer'

// =====================================================================
// Add Customer Modal — Inline
// =====================================================================
function AddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', enrollInLoyalty: false })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(`${form.firstName} ${form.lastName} added!`)
        onCreated()
        onClose()
      } else {
        toast.error('Failed to add customer')
      }
    } catch {
      toast.error('Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--theme-accent)]/30 focus:border-[var(--theme-accent)]/40 outline-none transition-all"

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 animate-scale-in shadow-2xl">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Add New Customer</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">First Name *</label>
            <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className={inputClass} placeholder="Jane" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Last Name *</label>
            <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className={inputClass} placeholder="Doe" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} placeholder="jane@example.com" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="enroll-loyalty" checked={form.enrollInLoyalty} onChange={e => setForm({...form, enrollInLoyalty: e.target.checked})} className="w-4 h-4 rounded border-[var(--border)] text-[var(--theme-accent)]" />
          <label htmlFor="enroll-loyalty" className="text-sm text-[var(--text-secondary)]">Enroll in loyalty program</label>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface2)]/80 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--theme-accent)] text-black hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Main Workspace Component
// =====================================================================
export default function CustomerWorkspace() {
  const toast = useToast()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Data hooks
  const { customers, allCustomers, loading, searchQuery, setSearchQuery, activeFilter, setActiveFilter, refetch } = useCustomerList()
  const { profile, loading: profileLoading, refetch: refetchProfile } = useCustomerProfile(selectedCustomerId)
  const { visits, loading: visitsLoading } = useCustomerVisits(selectedCustomerId)

  // ---- Actions ----

  const handleRepeatLastVisit = useCallback(() => {
    if (!visits.length) {
      toast.error('No visit history available')
      return
    }
    const lastVisit = visits[0]
    lastVisit.services.forEach(svc => {
      toast.success(`${svc.name} added to cart`)
    })
    toast.success(`${lastVisit.services.length} service${lastVisit.services.length !== 1 ? 's' : ''} from last visit added — $${lastVisit.total.toFixed(2)}`)
  }, [visits, toast])

  const handleRepeatVisit = useCallback((visitId: string) => {
    const visit = visits.find(v => v.id === visitId)
    if (!visit) return
    visit.services.forEach(svc => {
      // In a real implementation, this would call the POS cart context
      toast.success(`${svc.name} added`)
    })
    toast.success(`${visit.services.length} services added to cart — $${visit.total.toFixed(2)}`)
  }, [visits, toast])

  const handleAddService = useCallback((service: { id: string; name: string; price: number; type: string }) => {
    toast.success(`${service.name} added to cart — $${service.price.toFixed(2)}`)
  }, [toast])

  const handleAddFavorite = useCallback(() => {
    if (!visits.length) {
      toast.error('No service history available')
      return
    }
    // Find most repeated service
    const freq: Record<string, { name: string; count: number; price: number }> = {}
    visits.forEach(v => v.services.forEach(s => {
      const key = s.name.toLowerCase()
      if (!freq[key]) freq[key] = { name: s.name, count: 0, price: s.price }
      freq[key].count++
      freq[key].price = s.price
    }))
    const top = Object.values(freq).sort((a, b) => b.count - a.count)[0]
    if (top) {
      toast.success(`${top.name} added to cart — $${top.price.toFixed(2)}`)
    }
  }, [visits, toast])

  const handleAttachToCart = useCallback(() => {
    if (!profile) return
    toast.success(`${profile.name} attached to current ticket`)
  }, [profile, toast])

  const handleSaveProfile = useCallback(async (data: any): Promise<boolean> => {
    if (!profile) return false
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, ...data }),
      })
      if (res.ok) {
        toast.success('Customer updated!')
        refetchProfile()
        refetch()
        return true
      }
      toast.error('Failed to update customer')
      return false
    } catch {
      toast.error('Failed to update customer')
      return false
    }
  }, [profile, toast, refetchProfile, refetch])

  const handleDeleteCustomer = useCallback(async () => {
    if (!profile) return
    try {
      const res = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id }),
      })
      if (res.ok) {
        toast.success('Customer deleted')
        setSelectedCustomerId(null)
        refetch()
      } else {
        toast.error('Failed to delete customer')
      }
    } catch {
      toast.error('Failed to delete customer')
    }
  }, [profile, toast, refetch])

  const handleEnrollLoyalty = useCallback(async () => {
    if (!profile?.phone) {
      toast.error('Customer needs a phone number for loyalty enrollment')
      return
    }
    try {
      const res = await fetch('/api/owner/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll',
          phone: profile.phone.replace(/\D/g, ''),
          name: profile.name,
          email: profile.email || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await fetch('/api/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profile.id, loyaltyJoined: true }),
        })
        toast.success(`${profile.name} enrolled in loyalty program!`)
        refetchProfile()
        refetch()
      } else {
        toast.error(data.error || 'Failed to enroll')
      }
    } catch {
      toast.error('Failed to enroll customer')
    }
  }, [profile, toast, refetchProfile, refetch])

  const handleRowRepeat = useCallback((customer: SmartCustomerRow) => {
    setSelectedCustomerId(customer.id)
    // After selection & data loads, the repeat action will be available
    toast.success(`Select ${customer.name} — tap "Repeat Last" in profile`)
  }, [toast])

  const handleRowAddToCart = useCallback((customer: SmartCustomerRow) => {
    toast.success(`${customer.name} attached to current ticket`)
  }, [toast])

  const handleRowEdit = useCallback((customer: SmartCustomerRow) => {
    setSelectedCustomerId(customer.id)
  }, [])

  return (
    <>
      <div className="customer-workspace h-full">
        {/* Left Panel: Smart List */}
        <CustomerSmartList
          customers={customers}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          selectedId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
          onRepeatLastVisit={handleRowRepeat}
          onAddToCart={handleRowAddToCart}
          onEditCustomer={handleRowEdit}
          onAddNew={() => setShowAddModal(true)}
          totalCount={allCustomers.length}
        />

        {/* Right Panel: Profile */}
        <CustomerProfilePanel
          profile={profile}
          profileLoading={profileLoading}
          visits={visits}
          visitsLoading={visitsLoading}
          onEditProfile={() => {}}
          onAttachToCart={handleAttachToCart}
          onRepeatLastVisit={handleRepeatLastVisit}
          onAddFavorite={handleAddFavorite}
          onAddService={handleAddService}
          onRepeatVisit={handleRepeatVisit}
          onSaveProfile={handleSaveProfile}
          onDeleteCustomer={handleDeleteCustomer}
          onEnrollLoyalty={handleEnrollLoyalty}
          onClose={() => setSelectedCustomerId(null)}
        />
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onCreated={refetch}
        />
      )}

      {/* Workspace CSS */}
      <style jsx>{`
        .customer-workspace {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 0;
          overflow: hidden;
        }

        @media (max-width: 1279px) {
          .customer-workspace {
            grid-template-columns: 340px 1fr;
          }
        }

        @media (max-width: 1023px) {
          .customer-workspace {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
