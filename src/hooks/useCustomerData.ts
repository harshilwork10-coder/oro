'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CustomerProfile, SmartCustomerRow, CustomerTag, CustomerVisit, QuickRepeatData } from '@/types/customer'

// ============================================================
// Helper: relative date string
// ============================================================
function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase()
}

function computeTags(c: any): CustomerTag[] {
  const tags: CustomerTag[] = []

  // VIP: top spender or manually tagged
  if (c.lifetimeSpend > 1000 || c.totalVisits > 20) tags.push('VIP')

  // New: first visit within 14 days
  if (c.createdAt) {
    const daysSinceCreated = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceCreated <= 14 && c.totalVisits <= 2) tags.push('New')
  }

  // Inactive: 60+ days since last visit
  if (c.lastVisitDate) {
    const daysSinceLast = Math.floor((Date.now() - new Date(c.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLast >= 60) tags.push('Inactive')
    else if (daysSinceLast >= 30 && c.totalVisits > 5) tags.push('At-Risk')
  }

  // High Spender: top 10% (approximate with $500+ threshold)
  if (c.lifetimeSpend > 500 && !tags.includes('VIP')) tags.push('High Spender')

  // Reward Ready
  if (c.hasRewardReady) tags.push('Reward Ready')

  return tags
}

// ============================================================
// Hook: useCustomerList
// ============================================================
export function useCustomerList() {
  const [customers, setCustomers] = useState<SmartCustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<CustomerTag | null>(null)

  const fetchCustomers = useCallback(async (query?: string) => {
    try {
      const url = query && query.length >= 2
        ? `/api/pos/clients?query=${encodeURIComponent(query)}`
        : '/api/pos/clients'
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      const raw = data.data || data
      const list = (Array.isArray(raw) ? raw : []).map((c: any): SmartCustomerRow => {
        const firstName = c.firstName || c.name?.split(' ')[0] || ''
        const lastName = c.lastName || c.name?.split(' ').slice(1).join(' ') || ''
        const totalVisits = c._count?.appointments || c.visits || 0
        const lifetimeSpend = c.lifetimeSpend || 0
        return {
          id: c.id,
          name: `${firstName} ${lastName}`.trim() || 'Unknown',
          firstName,
          lastName,
          initials: getInitials(firstName, lastName),
          phone: c.phone || '',
          email: c.email || '',
          loyaltyPoints: c.loyalty?.points || c.loyaltyPoints || 0,
          totalVisits,
          lastVisitDate: c.lastVisit || c.lastVisitDate || null,
          lastVisitRelative: relativeDate(c.lastVisit || c.lastVisitDate),
          lifetimeSpend,
          averageTicket: totalVisits > 0 ? lifetimeSpend / totalVisits : 0,
          lastServiceName: c.lastServiceName || c.lastService || '',
          favoriteServiceName: c.favoriteService || '',
          preferredStylist: c.preferredStylist || '',
          tags: computeTags({ ...c, totalVisits, lifetimeSpend, lastVisitDate: c.lastVisit || c.lastVisitDate }),
          hasRewardReady: c.hasRewardReady || false,
          isCheckedIn: c.isCheckedIn || false,
          loyaltyMember: !!c.loyaltyJoined || !!c.loyalty,
        }
      })
      setCustomers(list)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery)
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchCustomers])

  const filtered = customers.filter(c => {
    if (activeFilter && !c.tags.includes(activeFilter)) return false
    return true
  })

  return {
    customers: filtered,
    allCustomers: customers,
    loading,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    refetch: () => fetchCustomers(searchQuery),
  }
}

// ============================================================
// Hook: useCustomerProfile
// ============================================================
export function useCustomerProfile(customerId: string | null) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true)
    try {
      // Fetch basic client data
      const res = await fetch(`/api/pos/clients?query=`)
      if (!res.ok) return
      const data = await res.json()
      const raw = data.data || data
      const clients = Array.isArray(raw) ? raw : []
      const c = clients.find((cl: any) => cl.id === id)
      if (!c) return

      const firstName = c.firstName || c.name?.split(' ')[0] || ''
      const lastName = c.lastName || c.name?.split(' ').slice(1).join(' ') || ''
      const totalVisits = c._count?.appointments || c.visits || 0
      const lifetimeSpend = c.lifetimeSpend || 0

      const prof: CustomerProfile = {
        id: c.id,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone: c.phone || '',
        email: c.email || '',
        birthday: c.birthday || c.dateOfBirth || undefined,
        memberSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
        loyaltyPoints: c.loyalty?.points || c.loyaltyPoints || 0,
        totalVisits,
        lifetimeSpend,
        averageTicket: totalVisits > 0 ? lifetimeSpend / totalVisits : 0,
        lastVisitDate: c.lastVisit || c.lastVisitDate || null,
        lastVisitRelative: relativeDate(c.lastVisit || c.lastVisitDate),
        preferredStylist: c.preferredStylist || '',
        tags: computeTags({ ...c, totalVisits, lifetimeSpend, lastVisitDate: c.lastVisit || c.lastVisitDate }),
        loyaltyMember: !!c.loyaltyJoined || !!c.loyalty,
        hasRewardReady: c.hasRewardReady || false,
        marketingConsent: c.marketingConsent,
        quickRepeat: {
          lastVisit: null,
          topRepeatedServices: [],
        },
        loyalty: {
          enrolled: !!c.loyaltyJoined || !!c.loyalty,
          points: c.loyalty?.points || c.loyaltyPoints || 0,
          progress: c.loyalty?.points || 0,
          threshold: 500,
          rewardAvailable: c.hasRewardReady || false,
          programs: [],
          history: [],
        },
        preferences: {
          cautionNotes: c.cautionNotes || [],
          servicePreferences: c.servicePreferences || [],
          staffNotes: c.staffNotes || [],
          preferredStylist: c.preferredStylist
            ? { id: '', name: c.preferredStylist }
            : undefined,
        },
      }

      setProfile(prof)
    } catch (err) {
      console.error('Failed to fetch customer profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (customerId) {
      fetchProfile(customerId)
    } else {
      setProfile(null)
    }
  }, [customerId, fetchProfile])

  return { profile, loading, refetch: () => customerId && fetchProfile(customerId) }
}

// ============================================================
// Hook: useCustomerVisits
// ============================================================
export function useCustomerVisits(customerId: string | null) {
  const [visits, setVisits] = useState<CustomerVisit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setVisits([])
      return
    }

    const fetchVisits = async () => {
      setLoading(true)
      try {
        // Try to fetch transactions for this client
        const res = await fetch(`/api/transactions?clientId=${customerId}&limit=10`)
        if (!res.ok) {
          setVisits([])
          return
        }
        const data = await res.json()
        const txs = data.transactions || data.data || data || []
        const mapped: CustomerVisit[] = (Array.isArray(txs) ? txs : []).map((tx: any) => ({
          id: tx.id,
          date: tx.createdAt || tx.date,
          dateRelative: relativeDate(tx.createdAt || tx.date),
          stylist: tx.employee?.name || tx.barber?.name || tx.stylist || 'N/A',
          services: (tx.lineItems || tx.items || []).map((li: any) => ({
            id: li.id || li.serviceId || li.productId || `item-${Math.random()}`,
            name: li.name || li.service?.name || li.product?.name || 'Service',
            price: li.total || li.price || li.unitPrice || 0,
            type: li.type === 'PRODUCT' ? 'PRODUCT' as const : 'SERVICE' as const,
          })),
          total: tx.total || 0,
          paymentMethod: tx.paymentMethod || tx.chargedMode || 'N/A',
          notes: tx.notes || undefined,
        }))
        setVisits(mapped)
      } catch (err) {
        console.error('Failed to fetch visits:', err)
        setVisits([])
      } finally {
        setLoading(false)
      }
    }

    fetchVisits()
  }, [customerId])

  return { visits, loading }
}
