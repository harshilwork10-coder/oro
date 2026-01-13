'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    Building2,
    Settings,
    Check,
    X,
    Search,
    ChevronLeft,
    Globe,
    Mail,
    MessageSquare,
    CreditCard,
    Calendar,
    Gift,
    Heart,
    Users,
    BarChart3,
    ShoppingBag,
    Loader2,
    Smartphone,
    MapPin,
    AlertTriangle,
    Ban,
    Power,
    RefreshCw,
    CheckCircle2,
    Clock,
    Store,
    DollarSign,
    Link2,
    Star,
    UserCheck,
    LayoutGrid,
    List,
    Filter,
    ArrowUpDown,
    ChevronDown,
    CheckSquare,
    Square,
    History,
    Users2,
    FileText,
    Trash2,
    Edit2,
    Copy,
    Share2,
    ExternalLink
} from 'lucide-react'
import RoleGuard from '@/components/auth/RoleGuard'
import { Role } from '@/lib/permissions'

// Only PROVIDER can access
const ALLOWED_ROLES = [Role.PROVIDER]

// Status options
const ACCOUNT_STATUSES = [
    { id: 'ACTIVE', name: 'Active', color: 'emerald', icon: CheckCircle2 },
    { id: 'PENDING', name: 'Pending', color: 'amber', icon: Clock },
    { id: 'SUSPENDED', name: 'Suspended', color: 'orange', icon: AlertTriangle },
    { id: 'TERMINATED', name: 'Terminated', color: 'red', icon: Ban },
]

// POS Mode options
const POS_MODES = [
    { id: 'SALON', name: 'Salon / Spa', icon: '💇', description: 'Services, appointments' },
    { id: 'RETAIL', name: 'Retail Store', icon: '🏪', description: 'Products, inventory' },
    { id: 'RESTAURANT', name: 'Restaurant', icon: '🍽️', description: 'Menu items, tables' },
    { id: 'HYBRID', name: 'Hybrid', icon: '🔄', description: 'Services + Products' },
]

// Features - filtered by business type (posMode)
const AVAILABLE_FEATURES = [
    // SALON-only features
    { id: 'usesServices', name: 'Services', icon: Calendar, forTypes: ['SALON', 'HYBRID'] },
    { id: 'usesAppointments', name: 'Appointments', icon: Calendar, forTypes: ['SALON', 'HYBRID'] },
    { id: 'enableResources', name: 'Resources', icon: Building2, forTypes: ['SALON', 'HYBRID'] },
    // RETAIL-specific features
    { id: 'usesInventory', name: 'Inventory', icon: ShoppingBag, forTypes: ['RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesAgeVerification', name: 'Age Verification', icon: Users, forTypes: ['RETAIL'] },
    { id: 'usesLottery', name: 'Lottery', icon: Gift, forTypes: ['RETAIL'] },
    { id: 'usesTobaccoScan', name: 'Tobacco Scan', icon: ShoppingBag, forTypes: ['RETAIL'] },
    // Shared features (apply to both SALON and RETAIL)
    { id: 'usesScheduling', name: 'Staff Scheduling', icon: Users, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesMemberships', name: 'Memberships', icon: Users, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesCommissions', name: 'Commissions', icon: CreditCard, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesReviewManagement', name: 'Reviews', icon: BarChart3, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesLoyalty', name: 'Loyalty Program', icon: Heart, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesGiftCards', name: 'Gift Cards', icon: Gift, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesEmailMarketing', name: 'Email Marketing', icon: Mail, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
    { id: 'usesSmsMarketing', name: 'SMS Marketing', icon: MessageSquare, forTypes: ['SALON', 'RETAIL', 'RESTAURANT', 'HYBRID'] },
]

// Integrations
const AVAILABLE_INTEGRATIONS = [
    { id: 'onlineBooking', name: 'Online Booking Page', icon: Globe, desc: 'Enable public booking page' },
    { id: 'smsBookingLink', name: 'SMS Booking Reminders', icon: MessageSquare, desc: 'Send booking links via SMS' },
]

interface LocationData {
    id: string
    name: string
    slug: string
    address: string | null
    pulseStoreCode: string | null
    stations: StationData[]
}

interface StationData {
    id: string
    name: string
    pairingCode: string | null
    isActive: boolean
}

interface Client {
    id: string
    name: string
    email: string
    businessName: string
    accountStatus: string
    approvalStatus: string
    posMode: 'SALON' | 'RETAIL' | 'RESTAURANT' | 'HYBRID'
    features: Record<string, boolean>
    integrations: Record<string, boolean>
    pulseSeatCount: number
    locationCount: number
    userCount: number
    locations: LocationData[]
    // Pricing settings
    pricingModel: 'STANDARD' | 'DUAL_PRICING'
    cardSurchargeType: 'PERCENTAGE' | 'FLAT_AMOUNT'
    cardSurcharge: number
    // Tip settings
    tipPromptEnabled: boolean
    tipType: 'PERCENT' | 'DOLLAR'
    tipSuggestions: string
    // Payment settings
    acceptsEbt: boolean
    acceptsChecks: boolean
    acceptsOnAccount: boolean
    // Document verification status
    documents: {
        voidCheck: boolean
        driverLicense: boolean
        feinLetter: boolean
    }
    // Service type
    processingType: 'POS_ONLY' | 'POS_AND_PROCESSING' | null
}

type CategoryView = 'status' | 'sales' | 'pulse' | 'features' | 'integrations' | 'locations' | 'pricing' | 'tips' | 'payments' | 'documents' | 'history' | null

interface PulseUser {
    id: string
    name: string | null
    email: string
    role: string
    hasPulseAccess: boolean
}

export default function AccountConfigurationsPage() {
    const { status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [categoryView, setCategoryView] = useState<CategoryView>(null)
    const [saving, setSaving] = useState(false)
    const [pulseUsers, setPulseUsers] = useState<PulseUser[]>([])
    const [loadingPulseUsers, setLoadingPulseUsers] = useState(false)

    // Salesforce-style filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [posTypeFilter, setPosTypeFilter] = useState<string>('ALL')
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'locations' | 'status'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list') // Default to list for faster workflow

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)

    // Grouping by owner
    const [groupByOwner, setGroupByOwner] = useState(false)

    // Expandable row for inline actions (no page navigation needed)
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

    // Audit trail
    const [auditLogs, setAuditLogs] = useState<Array<{
        id: string
        userEmail: string
        userRole?: string
        action: string
        changes: string | null | any
        createdAt: string
    }>>([])
    const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)

    // Add Station modal state
    const [addStationModal, setAddStationModal] = useState<{ open: boolean; locationId: string } | null>(null)
    const [stationName, setStationName] = useState('')

    // Toast notifications
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Station created success modal
    const [stationCreatedModal, setStationCreatedModal] = useState<{ name: string; pairingCode: string } | null>(null)

    // Edit station modal state
    const [editStationModal, setEditStationModal] = useState<{ open: boolean; station: StationData; locationId: string } | null>(null)
    const [editStationName, setEditStationName] = useState('')

    // Delete station confirmation
    const [deleteStationModal, setDeleteStationModal] = useState<{ open: boolean; station: StationData; locationId: string } | null>(null)

    // Get query params - enables direct navigation from My Clients page  
    const searchParams = useSearchParams()
    const clientIdFromUrl = searchParams.get('client')

    useEffect(() => {
        if (status === 'authenticated') {
            fetchClients()
        }
    }, [status])

    // Auto-select client if ?client=ID is in URL (from My Clients page dropdown)
    useEffect(() => {
        if (clientIdFromUrl && clients.length > 0 && !selectedClient) {
            const client = clients.find(c => c.id === clientIdFromUrl)
            if (client) {
                setSelectedClient(client)
            }
        }
    }, [clientIdFromUrl, clients, selectedClient])

    // Fetch Pulse users when entering pulse view
    useEffect(() => {
        if (categoryView === 'pulse' && selectedClient) {
            fetchPulseUsers(selectedClient.id)
        }
    }, [categoryView, selectedClient?.id])

    // Fetch audit logs when entering history view
    useEffect(() => {
        if (categoryView === 'history' && selectedClient) {
            fetchAuditLogs(selectedClient.id)
        }
    }, [categoryView, selectedClient?.id])

    async function fetchClients() {
        try {
            const res = await fetch('/api/admin/franchisors')
            if (res.ok) {
                const data = await res.json()
                const transformed = data.map((client: any) => {
                    // Extract locations with stations from the first franchise
                    const locations = (client.franchises?.[0]?.locations || []).map((loc: any) => ({
                        id: loc.id,
                        name: loc.name,
                        slug: loc.slug,
                        address: loc.address,
                        pulseStoreCode: loc.pulseStoreCode,
                        stations: (loc.stations || []).map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            pairingCode: s.pairingCode,
                            isActive: s.isActive
                        }))
                    }))

                    return {
                        id: client.id,
                        name: client.owner?.name || 'Unknown',
                        email: client.owner?.email || '',
                        businessName: client.businessName || client.name,
                        accountStatus: client.accountStatus || 'ACTIVE',
                        approvalStatus: client.approvalStatus || 'PENDING',
                        posMode: client.config?.posMode || 'SALON',
                        features: client.config || {},
                        integrations: client.integrations || {},
                        pulseSeatCount: client.config?.pulseSeatCount || 0,
                        locationCount: locations.length,
                        userCount: client.franchises?.[0]?.users?.length || 0,
                        locations,
                        // Pricing settings
                        pricingModel: client.config?.pricingModel || 'STANDARD',
                        cardSurchargeType: client.config?.cardSurchargeType || 'PERCENTAGE',
                        cardSurcharge: parseFloat(client.config?.cardSurcharge) || 0,
                        // Tip settings
                        tipPromptEnabled: client.config?.tipPromptEnabled ?? true,
                        tipType: client.config?.tipType || 'PERCENT',
                        tipSuggestions: client.config?.tipSuggestions || '15,18,20',
                        // Payment settings
                        acceptsEbt: client.config?.acceptsEbt ?? false,
                        acceptsChecks: client.config?.acceptsChecks ?? false,
                        acceptsOnAccount: client.config?.acceptsOnAccount ?? false,
                        // Document verification
                        documents: client.documents || { voidCheck: false, driverLicense: false, feinLetter: false },
                        // Service type (POS_ONLY or POS_AND_PROCESSING)
                        processingType: client.processingType || 'POS_AND_PROCESSING'
                    }
                })
                setClients(transformed)
            }
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    // API Calls
    async function updateConfig(clientId: string, updates: Record<string, any>) {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/franchisors/${clientId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            if (res.ok) {
                const data = await res.json()
                // Update local state with the server response to ensure consistency
                const updatedConfig = data.config || {}
                setClients(prev => prev.map(c =>
                    c.id === clientId
                        ? {
                            ...c,
                            ...updates,
                            pricingModel: updatedConfig.pricingModel || c.pricingModel,
                            cardSurcharge: parseFloat(updatedConfig.cardSurcharge) || c.cardSurcharge,
                            cardSurchargeType: updatedConfig.cardSurchargeType || c.cardSurchargeType,
                            features: { ...c.features, ...updates }
                        }
                        : c
                ))
                if (selectedClient?.id === clientId) {
                    setSelectedClient(prev => prev ? {
                        ...prev,
                        ...updates,
                        pricingModel: updatedConfig.pricingModel || prev.pricingModel,
                        cardSurcharge: parseFloat(updatedConfig.cardSurcharge) || prev.cardSurcharge,
                        cardSurchargeType: updatedConfig.cardSurchargeType || prev.cardSurchargeType,
                        features: { ...prev.features, ...updates }
                    } : null)
                }
            }
        } catch (error) {
            console.error('Error updating config:', error)
        } finally {
            setSaving(false)
        }
    }


    // Fetch audit logs for a client - all user activity under their franchise
    async function fetchAuditLogs(clientId: string) {
        setLoadingAuditLogs(true)
        try {
            // Use user-activity endpoint to get all activity from users under this franchisor
            const res = await fetch(`/api/admin/user-activity?franchisorId=${clientId}&limit=100`)
            if (res.ok) {
                const data = await res.json()
                setAuditLogs(data.logs || [])
            } else {
                // Fallback to old endpoint for config changes
                const resOld = await fetch(`/api/admin/audit-logs?entityId=${clientId}`)
                if (resOld.ok) {
                    const data = await resOld.json()
                    setAuditLogs(data.logs || [])
                }
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoadingAuditLogs(false)
        }
    }

    async function updateAccountStatus(clientId: string, accountStatus: string, reason?: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/franchisors/${clientId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountStatus, reason })
            })
            if (res.ok) {
                setClients(prev => prev.map(c =>
                    c.id === clientId ? { ...c, accountStatus } : c
                ))
                if (selectedClient?.id === clientId) {
                    setSelectedClient(prev => prev ? { ...prev, accountStatus } : null)
                }
            }
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setSaving(false)
        }
    }

    async function toggleIntegration(clientId: string, integrationId: string, enabled: boolean) {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/franchisors/${clientId}/integrations`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [integrationId]: enabled })
            })
            if (res.ok) {
                setClients(prev => prev.map(c =>
                    c.id === clientId
                        ? { ...c, integrations: { ...c.integrations, [integrationId]: enabled } }
                        : c
                ))
                if (selectedClient?.id === clientId) {
                    setSelectedClient(prev => prev ? { ...prev, integrations: { ...prev.integrations, [integrationId]: enabled } } : null)
                }
            }
        } catch (error) {
            console.error('Error toggling integration:', error)
        } finally {
            setSaving(false)
        }
    }

    // Fetch users for a franchise to show in Pulse assignment
    async function fetchPulseUsers(franchisorId: string) {
        setLoadingPulseUsers(true)
        try {
            const res = await fetch(`/api/admin/franchisors/${franchisorId}/users`)
            if (res.ok) {
                const data = await res.json()
                setPulseUsers(data.users || [])
            }
        } catch (error) {
            console.error('Error fetching pulse users:', error)
        } finally {
            setLoadingPulseUsers(false)
        }
    }

    // Toggle Pulse access for a user
    async function togglePulseAccess(userId: string, grantAccess: boolean) {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/pulse-seats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: grantAccess ? 'assign' : 'revoke' })
            })
            if (res.ok) {
                setPulseUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, hasPulseAccess: grantAccess } : u
                ))
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to update access')
            }
        } catch (error) {
            console.error('Error toggling pulse access:', error)
        } finally {
            setSaving(false)
        }
    }

    // Create a new station for a location
    async function createStation(locationId: string, name?: string) {
        if (!selectedClient) return

        // If no name provided, open the modal
        if (!name) {
            setAddStationModal({ open: true, locationId })
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/settings/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    name
                })
            })

            if (res.ok) {
                const data = await res.json()
                // Update the client's locations with the new station
                setSelectedClient(prev => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        locations: prev.locations.map(loc => {
                            if (loc.id === locationId) {
                                return {
                                    ...loc,
                                    stations: [...loc.stations, {
                                        id: data.station.id,
                                        name: data.station.name,
                                        pairingCode: data.station.pairingCode,
                                        isActive: true
                                    }]
                                }
                            }
                            return loc
                        })
                    }
                })
                // Show success modal with pairing code
                setStationCreatedModal({ name: name, pairingCode: data.station.pairingCode })
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to create station', type: 'error' })
            }
        } catch (error) {
            console.error('Error creating station:', error)
            setToast({ message: 'Failed to create station', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Edit station name
    async function editStation(stationId: string, newName: string, locationId: string) {
        if (!selectedClient) return

        setSaving(true)
        try {
            const res = await fetch(`/api/settings/stations?id=${stationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            })

            if (res.ok) {
                // Update local state
                setSelectedClient(prev => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        locations: prev.locations.map(loc => {
                            if (loc.id === locationId) {
                                return {
                                    ...loc,
                                    stations: loc.stations.map(s =>
                                        s.id === stationId ? { ...s, name: newName } : s
                                    )
                                }
                            }
                            return loc
                        })
                    }
                })
                setEditStationModal(null)
                setEditStationName('')
                setToast({ message: 'Station renamed', type: 'success' })
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to rename station', type: 'error' })
            }
        } catch (error) {
            console.error('Error editing station:', error)
            setToast({ message: 'Failed to rename station', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Delete station
    async function deleteStation(stationId: string, locationId: string) {
        if (!selectedClient) return

        setSaving(true)
        try {
            const res = await fetch(`/api/settings/stations?id=${stationId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                // Update local state
                setSelectedClient(prev => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        locations: prev.locations.map(loc => {
                            if (loc.id === locationId) {
                                return {
                                    ...loc,
                                    stations: loc.stations.filter(s => s.id !== stationId)
                                }
                            }
                            return loc
                        })
                    }
                })
                setDeleteStationModal(null)
                setToast({ message: 'Station deleted', type: 'success' })
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to delete station', type: 'error' })
            }
        } catch (error) {
            console.error('Error deleting station:', error)
            setToast({ message: 'Failed to delete station', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Bulk selection helpers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
        setShowBulkActions(newSet.size > 0)
    }

    const selectAll = () => {
        const allIds = new Set(filteredClients.map(c => c.id))
        setSelectedIds(allIds)
        setShowBulkActions(true)
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
        setShowBulkActions(false)
    }

    // Bulk status update
    async function bulkUpdateStatus(newStatus: string) {
        if (selectedIds.size === 0) return

        const confirmed = confirm(`Are you sure you want to change ${selectedIds.size} accounts to ${newStatus}?`)
        if (!confirmed) return

        setSaving(true)
        let successCount = 0

        for (const clientId of selectedIds) {
            try {
                const res = await fetch(`/api/admin/franchisors/${clientId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                })
                if (res.ok) {
                    successCount++
                    // Update local state
                    setClients(prev => prev.map(c =>
                        c.id === clientId ? { ...c, accountStatus: newStatus } : c
                    ))
                }
            } catch (error) {
                console.error('Error updating client:', error)
            }
        }

        setSaving(false)
        clearSelection()
        alert(`Successfully updated ${selectedIds.size} accounts`)
    }

    // Salesforce-style filtering and sorting
    const filteredClients = clients
        .filter(c => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase())

            // Status filter
            const matchesStatus = statusFilter === 'ALL' || c.accountStatus === statusFilter

            // POS type filter
            const matchesPosType = posTypeFilter === 'ALL' || c.posMode === posTypeFilter

            return matchesSearch && matchesStatus && matchesPosType
        })
        .sort((a, b) => {
            let comparison = 0
            switch (sortBy) {
                case 'name':
                    comparison = a.businessName.localeCompare(b.businessName)
                    break
                case 'date':
                    // Would need createdAt field, using name as fallback
                    comparison = a.businessName.localeCompare(b.businessName)
                    break
                case 'locations':
                    comparison = a.locationCount - b.locationCount
                    break
                case 'status':
                    comparison = a.accountStatus.localeCompare(b.accountStatus)
                    break
            }
            return sortOrder === 'asc' ? comparison : -comparison
        })

    // Group by owner email for multi-store view (must be after filteredClients)
    const groupedByOwner = groupByOwner
        ? filteredClients.reduce((acc, client) => {
            const email = client.email
            if (!acc[email]) {
                acc[email] = { owner: client.name, email, clients: [] }
            }
            acc[email].clients.push(client)
            return acc
        }, {} as Record<string, { owner: string; email: string; clients: Client[] }>)
        : null

    // Stats for tabs
    const stats = {
        all: clients.length,
        active: clients.filter(c => c.accountStatus === 'ACTIVE').length,
        pending: clients.filter(c => c.accountStatus === 'PENDING').length,
        suspended: clients.filter(c => c.accountStatus === 'SUSPENDED').length,
        terminated: clients.filter(c => c.accountStatus === 'TERMINATED').length
    }

    const getStatusConfig = (status: string) => {
        return ACCOUNT_STATUSES.find(s => s.id === status) || ACCOUNT_STATUSES[0]
    }

    // Render client card in grid
    function ClientCard({ client }: { client: Client }) {
        const statusConfig = getStatusConfig(client.accountStatus)
        const StatusIcon = statusConfig.icon

        return (
            <div
                onClick={() => setSelectedClient(client)}
                className={`bg-stone-900 border rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${client.accountStatus === 'SUSPENDED' ? 'border-orange-500/50' :
                    client.accountStatus === 'TERMINATED' ? 'border-red-500/50' :
                        client.accountStatus === 'PENDING' ? 'border-amber-500/50' :
                            'border-stone-700 hover:border-stone-500'
                    }`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl">
                            {POS_MODES.find(m => m.id === client.posMode)?.icon || '🏪'}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{client.businessName}</h3>
                            <p className="text-sm text-stone-400">{client.name}</p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.name}
                    </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-stone-400 mt-4">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {client.locationCount} location{client.locationCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {client.userCount} user{client.userCount !== 1 ? 's' : ''}
                    </span>
                    {client.pulseSeatCount > 0 && (
                        <span className="flex items-center gap-1.5 text-violet-400">
                            <Smartphone className="w-4 h-4" />
                            {client.pulseSeatCount} Pulse
                        </span>
                    )}
                </div>

                <button className="w-full mt-4 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-sm font-medium text-white transition-colors">
                    Configure →
                </button>
            </div>
        )
    }

    // Category Card
    function CategoryCard({
        icon: Icon,
        title,
        subtitle,
        color,
        onClick
    }: {
        icon: any
        title: string
        subtitle: string
        color: string
        onClick: () => void
    }) {
        return (
            <div
                onClick={onClick}
                className={`bg-stone-900 border border-stone-700 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:border-${color}-500/50`}
            >
                <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center mb-3`}>
                    <Icon className={`w-6 h-6 text-${color}-400`} />
                </div>
                <h4 className="font-bold text-white mb-1">{title}</h4>
                <p className="text-sm text-stone-400">{subtitle}</p>
            </div>
        )
    }

    // Client Detail View
    function ClientDetailView() {
        if (!selectedClient) return null

        const statusConfig = getStatusConfig(selectedClient.accountStatus)
        const applicableFeatures = AVAILABLE_FEATURES.filter(f => f.forTypes.includes(selectedClient.posMode))
        const enabledFeatures = Object.entries(selectedClient.features).filter(([k, v]) => v && applicableFeatures.find(f => f.id === k)).length
        const enabledIntegrations = Object.entries(selectedClient.integrations).filter(([k, v]) => v).length

        // Sub-views for categories
        if (categoryView === 'status') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Power className="w-6 h-6 text-violet-400" />
                            Account Status
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {ACCOUNT_STATUSES.map(status => {
                                const Icon = status.icon
                                const isActive = selectedClient.accountStatus === status.id
                                return (
                                    <button
                                        key={status.id}
                                        onClick={() => updateAccountStatus(selectedClient.id, status.id)}
                                        disabled={saving || status.id === 'PENDING'}
                                        className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${isActive
                                            ? `bg-${status.color}-500/20 border-${status.color}-500`
                                            : 'bg-stone-800/50 border-stone-700 hover:border-stone-500'
                                            } ${status.id === 'PENDING' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Icon className={`w-6 h-6 text-${status.color}-400`} />
                                        <div className="text-left">
                                            <p className={`font-bold ${isActive ? `text-${status.color}-400` : 'text-white'}`}>{status.name}</p>
                                            <p className="text-xs text-stone-500">
                                                {status.id === 'ACTIVE' && 'Full access to all features'}
                                                {status.id === 'PENDING' && 'Awaiting approval'}
                                                {status.id === 'SUSPENDED' && 'Temporarily disabled'}
                                                {status.id === 'TERMINATED' && 'Permanently closed'}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {selectedClient.accountStatus === 'SUSPENDED' && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                                <p className="text-orange-400 text-sm">
                                    ⚠️ This account is suspended. The owner cannot access their dashboard or POS until reactivated.
                                </p>
                            </div>
                        )}

                        {selectedClient.accountStatus === 'TERMINATED' && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                <p className="text-red-400 text-sm">
                                    🚫 This account has been terminated. All access is permanently revoked.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        if (categoryView === 'sales') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                            Sales Configuration
                        </h3>

                        <div className="mb-6">
                            <label className="text-sm font-medium text-stone-300 mb-3 block">POS Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {POS_MODES.map(mode => {
                                    const isActive = selectedClient.posMode === mode.id
                                    return (
                                        <button
                                            key={mode.id}
                                            onClick={() => updateConfig(selectedClient.id, { posMode: mode.id })}
                                            disabled={saving}
                                            className={`p-4 rounded-xl border transition-all text-left ${isActive
                                                ? 'bg-emerald-500/20 border-emerald-500'
                                                : 'bg-stone-800/50 border-stone-700 hover:border-stone-500'
                                                }`}
                                        >
                                            <span className="text-2xl mb-2 block">{mode.icon}</span>
                                            <p className={`font-bold ${isActive ? 'text-emerald-400' : 'text-white'}`}>{mode.name}</p>
                                            <p className="text-xs text-stone-500">{mode.description}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        if (categoryView === 'pulse') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Smartphone className="w-6 h-6 text-violet-400" />
                            Oro 9 Pulse Access
                        </h3>

                        <div className="mb-6">
                            <label className="text-sm font-medium text-stone-300 mb-3 block">Seat Licenses</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={selectedClient.pulseSeatCount}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0)
                                        updateConfig(selectedClient.id, { pulseSeatCount: val, usesMobilePulse: val > 0 })
                                    }}
                                    className="w-24 px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl text-center text-2xl font-bold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                />
                                <div className="text-stone-400">
                                    <p className="font-medium text-white">owners/managers can use Pulse</p>
                                    <p className="text-sm">Each seat is $X/month extra</p>
                                </div>
                            </div>
                        </div>

                        {selectedClient.pulseSeatCount > 0 && (
                            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                                <p className="text-violet-400 text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Pulse is enabled. Assign users below.
                                </p>
                            </div>
                        )}

                        {/* Pulse Users Section */}
                        <div className="mt-6 border-t border-stone-700 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-white">Pulse Users</h4>
                                <span className="text-xs text-stone-500">
                                    {pulseUsers.filter(u => u.hasPulseAccess).length} / {selectedClient.pulseSeatCount} seats used
                                </span>
                            </div>

                            {selectedClient.pulseSeatCount > 0 ? (
                                <div className="space-y-3">
                                    {loadingPulseUsers ? (
                                        <div className="text-center py-4 text-stone-500">Loading users...</div>
                                    ) : pulseUsers.length > 0 ? (
                                        <>
                                            {/* User list with toggle buttons */}
                                            {pulseUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between p-3 bg-stone-800 rounded-xl border border-stone-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.hasPulseAccess ? 'bg-violet-500/20' : 'bg-stone-700'}`}>
                                                            <Users className={`w-5 h-5 ${user.hasPulseAccess ? 'text-violet-400' : 'text-stone-500'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{user.name || 'Unnamed'}</p>
                                                            <p className="text-xs text-stone-500">{user.email} • {user.role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => togglePulseAccess(user.id, !user.hasPulseAccess)}
                                                        disabled={saving}
                                                        className={`px-3 py-1.5 text-xs rounded-lg transition-all ${user.hasPulseAccess
                                                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                                                            : 'bg-stone-700 text-stone-400 hover:bg-violet-500/20 hover:text-violet-400'
                                                            }`}
                                                    >
                                                        {user.hasPulseAccess ? 'Has Access ✓' : 'Grant Access'}
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Info about how login works */}
                                            <div className="p-3 bg-stone-800/50 rounded-xl border border-stone-700 mt-4">
                                                <p className="text-sm text-stone-400">
                                                    <span className="text-white font-medium">How users login to Pulse:</span>
                                                </p>
                                                <ul className="mt-2 text-xs text-stone-500 space-y-1">
                                                    <li>• First time: Email + Password</li>
                                                    <li>• Daily: 4-digit PIN (if set)</li>
                                                    <li>• Device remembered after first login</li>
                                                </ul>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-4 text-stone-500">
                                            No users found for this client.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-stone-800/50 rounded-xl p-6 text-center border border-dashed border-stone-700">
                                    <Smartphone className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                    <p className="text-stone-500 text-sm">No Pulse seats allocated</p>
                                    <p className="text-stone-600 text-xs mt-1">Set seat count above to enable Pulse access</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        if (categoryView === 'features') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Star className="w-6 h-6 text-amber-400" />
                            Features
                        </h3>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {AVAILABLE_FEATURES
                                .filter(f => f.forTypes.includes(selectedClient.posMode))
                                .map(feature => {
                                    const isEnabled = selectedClient.features[feature.id] ?? false
                                    const Icon = feature.icon
                                    return (
                                        <button
                                            key={feature.id}
                                            onClick={() => updateConfig(selectedClient.id, { [feature.id]: !isEnabled })}
                                            disabled={saving}
                                            className={`p-4 rounded-xl border transition-all text-left ${isEnabled
                                                ? 'bg-emerald-500/20 border-emerald-500/50'
                                                : 'bg-stone-800/50 border-stone-700 hover:bg-stone-700/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Icon className={`w-5 h-5 ${isEnabled ? 'text-emerald-400' : 'text-stone-500'}`} />
                                                {isEnabled ? (
                                                    <Check className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <X className="w-5 h-5 text-stone-600" />
                                                )}
                                            </div>
                                            <p className={`font-medium ${isEnabled ? 'text-white' : 'text-stone-400'}`}>
                                                {feature.name}
                                            </p>
                                        </button>
                                    )
                                })}
                        </div>
                    </div>
                </div>
            )
        }

        if (categoryView === 'integrations') {
            // Get the booking slug from the first location
            const bookingSlug = selectedClient.locations?.[0]?.slug || selectedClient.name.toLowerCase().replace(/\s+/g, '-')
            const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${bookingSlug}`

            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    {/* Direct Booking Link Section */}
                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <Globe className="w-6 h-6 text-blue-400" />
                            Direct Booking Link
                        </h3>
                        <p className="text-stone-400 text-sm mb-4">
                            Share this link with customers so they can book appointments online.
                        </p>

                        {/* Booking URL Display */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 text-stone-300 font-mono text-sm overflow-hidden">
                                {bookingUrl}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(bookingUrl)
                                    setToast({ message: 'Booking link copied!', type: 'success' })
                                }}
                                className="px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors flex items-center gap-2"
                                title="Copy link"
                            >
                                <Copy className="w-4 h-4" />
                                Copy
                            </button>
                            <a
                                href={bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                title="Open booking page"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Share Options */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const smsBody = encodeURIComponent(`Book your appointment here: ${bookingUrl}`)
                                    window.open(`sms:?body=${smsBody}`, '_blank')
                                }}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                                <MessageSquare className="w-5 h-5" />
                                Share via SMS
                            </button>
                            <button
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: `Book with ${selectedClient.businessName}`,
                                            text: 'Book your appointment online',
                                            url: bookingUrl
                                        })
                                    } else {
                                        navigator.clipboard.writeText(bookingUrl)
                                        setToast({ message: 'Link copied!', type: 'success' })
                                    }
                                }}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                                <Share2 className="w-5 h-5" />
                                Share
                            </button>
                        </div>
                    </div>

                    {/* Other Integrations */}
                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Link2 className="w-6 h-6 text-blue-400" />
                            Booking Settings
                        </h3>

                        <div className="space-y-3">
                            {AVAILABLE_INTEGRATIONS.map(integration => {
                                const isEnabled = selectedClient.integrations[integration.id] ?? false
                                const Icon = integration.icon
                                return (
                                    <div
                                        key={integration.id}
                                        className={`p-4 rounded-xl border transition-all ${isEnabled
                                            ? 'bg-emerald-500/20 border-emerald-500/50'
                                            : 'bg-stone-800/50 border-stone-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-5 h-5 ${isEnabled ? 'text-emerald-400' : 'text-stone-500'}`} />
                                                <div>
                                                    <div className={isEnabled ? 'text-white font-medium' : 'text-stone-400'}>{integration.name}</div>
                                                    <div className="text-xs text-stone-500">{integration.desc}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleIntegration(selectedClient.id, integration.id, !isEnabled)}
                                                disabled={saving}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEnabled
                                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                    }`}
                                            >
                                                {isEnabled ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )
        }

        if (categoryView === 'locations') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-pink-400" />
                            Locations & Stations
                        </h3>

                        {selectedClient.locations.length === 0 ? (
                            <div className="bg-stone-800/50 rounded-xl p-8 text-center border border-dashed border-stone-700">
                                <Store className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                                <p className="text-stone-500">No locations found</p>
                                <p className="text-stone-600 text-sm mt-1">This client has no stores set up yet</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {selectedClient.locations.map(location => (
                                    <div key={location.id} className="bg-stone-800/50 rounded-xl border border-stone-700 overflow-hidden">
                                        {/* Location Header */}
                                        <div className="p-4 border-b border-stone-700">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-bold text-white flex items-center gap-2">
                                                        <Store className="w-4 h-4 text-pink-400" />
                                                        {location.name}
                                                    </h4>
                                                    <p className="text-xs text-stone-500 mt-1">
                                                        {location.address || 'No address'} • ID: {location.slug}
                                                    </p>
                                                </div>
                                                {/* Pulse Store Code */}
                                                <div className="text-right">
                                                    <p className="text-xs text-stone-500 mb-1">Pulse Store Code</p>
                                                    {location.pulseStoreCode ? (
                                                        <span className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded-lg font-mono text-sm font-bold">
                                                            {location.pulseStoreCode}
                                                        </span>
                                                    ) : (
                                                        <span className="text-stone-600 text-sm">Not set</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stations List */}
                                        <div className="p-4">
                                            <p className="text-xs font-medium text-stone-400 mb-3 flex items-center gap-2">
                                                <CreditCard className="w-3 h-3" />
                                                POS STATIONS ({location.stations.length})
                                            </p>

                                            {location.stations.length === 0 ? (
                                                <p className="text-stone-600 text-sm mb-3">No stations configured</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    {location.stations.map(station => (
                                                        <div
                                                            key={station.id}
                                                            className={`p-3 rounded-lg border ${station.isActive
                                                                ? 'bg-stone-800 border-stone-600'
                                                                : 'bg-stone-900 border-stone-700 opacity-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-white font-medium">{station.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {station.isActive && (
                                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setEditStationName(station.name)
                                                                            setEditStationModal({ open: true, station, locationId: location.id })
                                                                        }}
                                                                        className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-blue-400 transition-colors"
                                                                        title="Edit station name"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setDeleteStationModal({ open: true, station, locationId: location.id })
                                                                        }}
                                                                        className="p-1 hover:bg-stone-700 rounded text-stone-400 hover:text-red-400 transition-colors"
                                                                        title="Delete station"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-1">
                                                                <span className="text-xs text-stone-500">Pairing: </span>
                                                                {station.pairingCode ? (
                                                                    <span className="font-mono text-xs text-amber-400 font-bold">
                                                                        {station.pairingCode}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-stone-600">None</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1">
                                                                <span className="text-xs text-stone-600">ID: {station.id.slice(0, 8)}...</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add Station Button */}
                                            <button
                                                onClick={() => createStation(location.id)}
                                                disabled={saving}
                                                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <span className="text-lg">+</span>
                                                Add Station
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Info box */}
                        <div className="mt-6 p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                            <p className="text-sm text-stone-400">
                                <span className="text-white font-medium">How codes work:</span>
                            </p>
                            <ul className="mt-2 text-xs text-stone-500 space-y-1">
                                <li>• <span className="text-violet-400">Pulse Store Code</span> - Used by owners to pair their phone with this store</li>
                                <li>• <span className="text-amber-400">Station Pairing Code</span> - Used by POS terminals to connect to a specific register</li>
                            </ul>
                        </div>
                    </div>
                </div >
            )
        }

        // Pricing settings view
        if (categoryView === 'pricing') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <CreditCard className="w-6 h-6 text-green-400" />
                            Pricing Configuration
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-stone-300 mb-3">Pricing Model</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => updateConfig(selectedClient.id, { pricingModel: 'STANDARD' })}
                                        disabled={saving}
                                        className={`flex-1 p-4 rounded-xl border transition-all ${selectedClient.pricingModel === 'STANDARD'
                                            ? 'border-green-500 bg-green-500/20'
                                            : 'border-stone-700 hover:border-stone-500'
                                            }`}
                                    >
                                        <div className="font-bold text-white">Standard Pricing</div>
                                        <div className="text-sm text-stone-400">Single price for all payments</div>
                                    </button>
                                    <button
                                        onClick={() => updateConfig(selectedClient.id, { pricingModel: 'DUAL_PRICING' })}
                                        disabled={saving}
                                        className={`flex-1 p-4 rounded-xl border transition-all ${selectedClient.pricingModel === 'DUAL_PRICING'
                                            ? 'border-green-500 bg-green-500/20'
                                            : 'border-stone-700 hover:border-stone-500'
                                            }`}
                                    >
                                        <div className="font-bold text-white">Dual Pricing</div>
                                        <div className="text-sm text-stone-400">Cash discount / card surcharge</div>
                                    </button>
                                </div>
                            </div>

                            {selectedClient.pricingModel === 'DUAL_PRICING' && (
                                <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                    <label className="block text-sm font-semibold text-stone-300 mb-2">Card Surcharge</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={selectedClient.cardSurcharge}
                                            onChange={(e) => updateConfig(selectedClient.id, { cardSurcharge: parseFloat(e.target.value) })}
                                            className="w-32 px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                                        />
                                        <span className="text-stone-400">%</span>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-2">Example: $100 → ${(100 * (1 + selectedClient.cardSurcharge / 100)).toFixed(2)} card price</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        // Tips settings view
        if (categoryView === 'tips') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-teal-400" />
                            Tip Settings
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                                <div>
                                    <div className="font-semibold text-white">Enable Tip Prompt</div>
                                    <div className="text-sm text-stone-400">Show tip options during checkout</div>
                                </div>
                                <button
                                    onClick={() => updateConfig(selectedClient.id, { tipPromptEnabled: !selectedClient.tipPromptEnabled })}
                                    disabled={saving}
                                    className={`relative w-14 h-8 rounded-full transition-all ${selectedClient.tipPromptEnabled ? 'bg-teal-500' : 'bg-stone-600'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${selectedClient.tipPromptEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {selectedClient.tipPromptEnabled && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-stone-300 mb-2">Tip Suggestions</label>
                                        <input
                                            type="text"
                                            value={selectedClient.tipSuggestions}
                                            onChange={(e) => updateConfig(selectedClient.id, { tipSuggestions: e.target.value })}
                                            className="w-full max-w-sm px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white"
                                            placeholder="15,18,20,25"
                                        />
                                        <p className="text-xs text-stone-500 mt-2">Comma-separated percentages</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        // Payments settings view
        if (categoryView === 'payments') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Gift className="w-6 h-6 text-orange-400" />
                            Payment Methods
                        </h3>

                        <div className="space-y-4">
                            {[
                                { key: 'acceptsEbt', name: 'Accept EBT', desc: 'Electronic Benefit Transfer cards' },
                                { key: 'acceptsChecks', name: 'Accept Checks', desc: 'Personal or business checks' },
                                { key: 'acceptsOnAccount', name: 'Store Credit', desc: 'Allow customer account balances' }
                            ].map(payment => (
                                <div key={payment.key} className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                    <div>
                                        <div className="font-semibold text-white">{payment.name}</div>
                                        <div className="text-sm text-stone-400">{payment.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => updateConfig(selectedClient.id, { [payment.key]: !(selectedClient as any)[payment.key] })}
                                        disabled={saving}
                                        className={`relative w-14 h-8 rounded-full transition-all ${(selectedClient as any)[payment.key] ? 'bg-orange-500' : 'bg-stone-600'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${(selectedClient as any)[payment.key] ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                            <p className="text-sm text-stone-400">
                                <span className="text-white font-medium">Note:</span> Cash and Card payments are always enabled. These settings add additional payment options.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }

        // Documents view
        if (categoryView === 'documents') {
            const handleDocumentUpload = async (docKey: string, file: File) => {
                setSaving(true)
                try {
                    // Create FormData for file upload
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('documentType', docKey)
                    formData.append('franchisorId', selectedClient.id)

                    const res = await fetch('/api/admin/documents/upload', {
                        method: 'POST',
                        body: formData
                    })

                    if (res.ok) {
                        // Update local state
                        setSelectedClient(prev => prev ? {
                            ...prev,
                            documents: { ...prev.documents, [docKey]: true }
                        } : null)
                        setClients(prev => prev.map(c =>
                            c.id === selectedClient.id
                                ? { ...c, documents: { ...c.documents, [docKey]: true } }
                                : c
                        ))
                        setToast({ message: 'Document uploaded successfully', type: 'success' })
                    } else {
                        const data = await res.json()
                        setToast({ message: data.error || 'Failed to upload', type: 'error' })
                    }
                } catch (error) {
                    console.error('Upload error:', error)
                    setToast({ message: 'Upload failed', type: 'error' })
                } finally {
                    setSaving(false)
                }
            }

            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-red-400" />
                            Required Documents
                        </h3>

                        {/* Service Type Badge */}
                        <div className="mb-6 p-3 rounded-xl border border-stone-700 bg-stone-800/50">
                            <p className="text-xs text-stone-400 mb-1">Service Type</p>
                            <p className={`font-semibold ${selectedClient.processingType === 'POS_ONLY' ? 'text-purple-400' : 'text-orange-400'}`}>
                                {selectedClient.processingType === 'POS_ONLY' ? '📱 POS Only' : '💳 POS + Processing'}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                {selectedClient.processingType === 'POS_ONLY'
                                    ? 'Only Void Check required for bank verification'
                                    : 'Full documentation required for payment processing'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Conditional documents based on processingType */}
                            {(selectedClient.processingType === 'POS_ONLY'
                                ? [
                                    { key: 'voidCheck', name: 'Void Check', desc: 'For bank account verification', icon: '🏦', accept: 'image/*,.pdf' }
                                ]
                                : [
                                    { key: 'voidCheck', name: 'Void Check', desc: 'For bank account verification', icon: '🏦', accept: 'image/*,.pdf' },
                                    { key: 'driverLicense', name: 'Driver License', desc: 'Government-issued ID', icon: '🪪', accept: 'image/*,.pdf' },
                                    { key: 'feinLetter', name: 'FEIN Letter', desc: 'Federal Employer ID Number', icon: '📄', accept: 'image/*,.pdf' }
                                ]
                            ).map(doc => (
                                <div key={doc.key} className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{doc.icon}</span>
                                        <div>
                                            <div className="font-semibold text-white">{doc.name}</div>
                                            <div className="text-sm text-stone-400">{doc.desc}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {(selectedClient.documents as any)[doc.key] ? (
                                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                                                ✓ Uploaded
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                                                Missing
                                            </span>
                                        )}
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept={doc.accept}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleDocumentUpload(doc.key, file)
                                                }}
                                                disabled={saving}
                                            />
                                            <span className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saving
                                                ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                                                : 'bg-violet-600 hover:bg-violet-500 text-white'
                                                }`}>
                                                {(selectedClient.documents as any)[doc.key] ? 'Replace' : 'Upload'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                            <p className="text-sm text-stone-400">
                                <span className="text-white font-medium">Accepted formats:</span> Images (JPG, PNG) or PDF files. Max 10MB per file.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }

        // Audit History view
        if (categoryView === 'history') {
            return (
                <div className="space-y-6">
                    <button
                        onClick={() => setCategoryView(null)}
                        className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to {selectedClient.businessName}
                    </button>

                    <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <History className="w-6 h-6 text-slate-400" />
                            Change History
                        </h3>

                        {loadingAuditLogs ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="text-center py-8">
                                <History className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                                <p className="text-stone-500">No activity recorded yet</p>
                                <p className="text-xs text-stone-600 mt-1">User actions like sales, refunds, logins will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {auditLogs.map(log => {
                                    let changes: any = {}
                                    try {
                                        changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : (log.changes || {})
                                    } catch { }

                                    // Get action-specific styling
                                    const getActionStyle = (action: string) => {
                                        switch (action) {
                                            case 'SALE_COMPLETED':
                                                return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '💰 Sale' }
                                            case 'REFUND_PROCESSED':
                                                return { bg: 'bg-red-500/20', text: 'text-red-400', label: '↩️ Refund' }
                                            case 'LOGIN':
                                            case 'PIN_LOGIN':
                                                return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '🔐 Login' }
                                            case 'LOGOUT':
                                                return { bg: 'bg-stone-500/20', text: 'text-stone-400', label: '🚪 Logout' }
                                            case 'SHIFT_STARTED':
                                                return { bg: 'bg-green-500/20', text: 'text-green-400', label: '▶️ Shift Start' }
                                            case 'SHIFT_ENDED':
                                                return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '⏹️ Shift End' }
                                            case 'PRODUCT_ADDED':
                                            case 'PRODUCT_UPDATED':
                                                return { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '📦 Inventory' }
                                            case 'DISCOUNT_APPLIED':
                                                return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '🏷️ Discount' }
                                            case 'PRICE_OVERRIDE':
                                                return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '⚠️ Price Override' }
                                            case 'SETTINGS_UPDATED':
                                            case 'UPDATED':
                                                return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '⚙️ Settings' }
                                            default:
                                                return { bg: 'bg-stone-700', text: 'text-stone-400', label: action }
                                        }
                                    }
                                    const style = getActionStyle(log.action)

                                    return (
                                        <div key={log.id} className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-stone-600 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text}`}>
                                                        {style.label}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm text-white font-medium">{log.userEmail}</p>
                                                        <p className="text-xs text-stone-500">{log.userRole || 'Unknown role'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-stone-500">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Action details */}
                                            {changes && Object.keys(changes).length > 0 && (
                                                <div className="mt-3 p-2 bg-stone-900/50 rounded-lg">
                                                    {changes.total && (
                                                        <p className="text-sm text-white">
                                                            Amount: <span className={changes.total < 0 ? 'text-red-400' : 'text-emerald-400'}>
                                                                ${Math.abs(changes.total).toFixed(2)}
                                                            </span>
                                                            {changes.paymentMethod && (
                                                                <span className="text-stone-400 ml-2">({changes.paymentMethod})</span>
                                                            )}
                                                        </p>
                                                    )}
                                                    {changes.invoiceNumber && (
                                                        <p className="text-xs text-stone-400">Invoice: {changes.invoiceNumber}</p>
                                                    )}
                                                    {changes.reason && (
                                                        <p className="text-xs text-orange-400 mt-1">Reason: {changes.reason}</p>
                                                    )}
                                                    {changes.fields && changes.fields.length > 0 && (
                                                        <p className="text-xs text-stone-400">Changed: {changes.fields.join(', ')}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        <p className="mt-6 text-xs text-stone-600 text-center">
                            📋 This log is preserved for legal and audit purposes
                        </p>
                    </div>
                </div>
            )
        }

        // Main category cards view
        return (
            <div className="space-y-6">
                <Link
                    href="/dashboard/account-configs"
                    className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors cursor-pointer relative z-50 mb-4"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back to All Clients
                </Link>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl">
                        {POS_MODES.find(m => m.id === selectedClient.posMode)?.icon || '🏪'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                        <p className="text-stone-400">{selectedClient.businessName} • {selectedClient.email}</p>
                    </div>
                    <span className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                        {statusConfig.name}
                    </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <CategoryCard
                        icon={Power}
                        title="Account Status"
                        subtitle={statusConfig.name}
                        color={statusConfig.color}
                        onClick={() => setCategoryView('status')}
                    />
                    <CategoryCard
                        icon={DollarSign}
                        title="Sales Config"
                        subtitle={POS_MODES.find(m => m.id === selectedClient.posMode)?.name || 'Unknown'}
                        color="emerald"
                        onClick={() => setCategoryView('sales')}
                    />
                    <CategoryCard
                        icon={Smartphone}
                        title="Pulse"
                        subtitle={selectedClient.pulseSeatCount > 0 ? `${selectedClient.pulseSeatCount} seats` : 'Not enabled'}
                        color="violet"
                        onClick={() => setCategoryView('pulse')}
                    />
                    <CategoryCard
                        icon={Star}
                        title="Features"
                        subtitle={`${enabledFeatures}/${AVAILABLE_FEATURES.length} enabled`}
                        color="amber"
                        onClick={() => setCategoryView('features')}
                    />
                    <CategoryCard
                        icon={Link2}
                        title="Integrations"
                        subtitle={enabledIntegrations > 0 ? `${enabledIntegrations} connected` : 'None'}
                        color="blue"
                        onClick={() => setCategoryView('integrations')}
                    />
                    <CategoryCard
                        icon={MapPin}
                        title="Locations"
                        subtitle={`${selectedClient.locationCount} store${selectedClient.locationCount !== 1 ? 's' : ''}`}
                        color="pink"
                        onClick={() => setCategoryView('locations')}
                    />
                    <CategoryCard
                        icon={CreditCard}
                        title="Pricing"
                        subtitle={selectedClient.pricingModel === 'DUAL_PRICING' ? `Dual (${selectedClient.cardSurcharge}%)` : 'Standard'}
                        color="green"
                        onClick={() => setCategoryView('pricing')}
                    />
                    <CategoryCard
                        icon={DollarSign}
                        title="Tips"
                        subtitle={selectedClient.tipPromptEnabled ? `${selectedClient.tipSuggestions}` : 'Disabled'}
                        color="teal"
                        onClick={() => setCategoryView('tips')}
                    />
                    <CategoryCard
                        icon={Gift}
                        title="Payments"
                        subtitle={[
                            selectedClient.acceptsEbt && 'EBT',
                            selectedClient.acceptsChecks && 'Checks',
                            selectedClient.acceptsOnAccount && 'Credit'
                        ].filter(Boolean).join(', ') || 'Cash & Card only'}
                        color="orange"
                        onClick={() => setCategoryView('payments')}
                    />
                    <CategoryCard
                        icon={FileText}
                        title="Documents"
                        subtitle={selectedClient.processingType === 'POS_ONLY'
                            ? (selectedClient.documents.voidCheck ? '✓ Void Check' : '⚠️ Missing Void Check')
                            : [
                                selectedClient.documents.voidCheck && '✓ Check',
                                selectedClient.documents.driverLicense && '✓ DL',
                                selectedClient.documents.feinLetter && '✓ FEIN'
                            ].filter(Boolean).join(', ') || '⚠️ Missing docs'}
                        color={selectedClient.processingType === 'POS_ONLY'
                            ? (selectedClient.documents.voidCheck ? 'emerald' : 'red')
                            : (selectedClient.documents.voidCheck && selectedClient.documents.driverLicense ? 'emerald' : 'red')}
                        onClick={() => setCategoryView('documents')}
                    />
                    <CategoryCard
                        icon={History}
                        title="History"
                        subtitle="View change log"
                        color="slate"
                        onClick={() => setCategoryView('history')}
                    />
                </div>
            </div>
        )
    }

    if (status === 'loading' || loading) {
        return (
            <RoleGuard allowedRoles={ALLOWED_ROLES}>
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            </RoleGuard>
        )
    }

    return (
        <RoleGuard allowedRoles={ALLOWED_ROLES}>
            <div className="min-h-screen bg-black">
                <div className="max-w-7xl mx-auto p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Account Configurations</h1>
                        <p className="text-stone-400">Manage client settings, features, and access</p>
                    </div>

                    {selectedClient ? (
                        <ClientDetailView />
                    ) : (
                        <>
                            {/* Salesforce-style Status Tabs */}
                            <div className="flex items-center gap-1 mb-4 border-b border-stone-800">
                                {[
                                    { id: 'ALL', label: 'All Accounts', count: stats.all },
                                    { id: 'ACTIVE', label: 'Active', count: stats.active, color: 'emerald' },
                                    { id: 'PENDING', label: 'Pending', count: stats.pending, color: 'amber' },
                                    { id: 'SUSPENDED', label: 'Suspended', count: stats.suspended, color: 'orange' },
                                    { id: 'TERMINATED', label: 'Terminated', count: stats.terminated, color: 'red' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${statusFilter === tab.id
                                            ? `border-violet-500 text-white`
                                            : 'border-transparent text-stone-400 hover:text-white'
                                            }`}
                                    >
                                        {tab.label}
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusFilter === tab.id ? 'bg-violet-500/20 text-violet-400' : 'bg-stone-800 text-stone-500'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Search & Filter Bar */}
                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[250px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-violet-500 text-sm"
                                    />
                                </div>

                                {/* POS Type Filter */}
                                <div className="relative">
                                    <select
                                        value={posTypeFilter}
                                        onChange={(e) => setPosTypeFilter(e.target.value)}
                                        className="appearance-none pl-4 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 cursor-pointer"
                                    >
                                        <option value="ALL">All Types</option>
                                        <option value="SALON">Salon</option>
                                        <option value="RETAIL">Retail</option>
                                        <option value="RESTAURANT">Restaurant</option>
                                        <option value="HYBRID">Hybrid</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 pointer-events-none" />
                                </div>

                                {/* Sort */}
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="appearance-none pl-4 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 cursor-pointer"
                                    >
                                        <option value="name">Sort: Name</option>
                                        <option value="locations">Sort: Locations</option>
                                        <option value="status">Sort: Status</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 pointer-events-none" />
                                </div>

                                {/* Sort Order Toggle */}
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="p-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors"
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
                                </button>

                                {/* Group by Owner Toggle */}
                                <button
                                    onClick={() => setGroupByOwner(!groupByOwner)}
                                    className={`p-2.5 rounded-lg border transition-colors ${groupByOwner
                                        ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                                        : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'}`}
                                    title="Group by owner"
                                >
                                    <Users2 className="h-4 w-4" />
                                </button>

                                {/* View Toggle */}
                                <div className="flex bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2.5 ${viewMode === 'grid' ? 'bg-violet-500/20 text-violet-400' : 'text-stone-400 hover:text-white'}`}
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2.5 ${viewMode === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-stone-400 hover:text-white'}`}
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Actions Toolbar */}
                            {showBulkActions && (
                                <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center gap-4">
                                    <span className="text-sm text-violet-400 font-medium">
                                        {selectedIds.size} selected
                                    </span>
                                    <div className="h-4 w-px bg-violet-500/30" />
                                    <button
                                        onClick={() => bulkUpdateStatus('ACTIVE')}
                                        disabled={saving}
                                        className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50"
                                    >
                                        Activate All
                                    </button>
                                    <button
                                        onClick={() => bulkUpdateStatus('SUSPENDED')}
                                        disabled={saving}
                                        className="px-3 py-1.5 text-sm bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 disabled:opacity-50"
                                    >
                                        Suspend All
                                    </button>
                                    <button
                                        onClick={clearSelection}
                                        className="ml-auto text-sm text-stone-400 hover:text-white"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            )}

                            {/* Results count with Select All */}
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={selectedIds.size === filteredClients.length ? clearSelection : selectAll}
                                    className="flex items-center gap-2 text-sm text-stone-400 hover:text-white"
                                >
                                    {selectedIds.size === filteredClients.length && filteredClients.length > 0 ? (
                                        <CheckSquare className="h-4 w-4 text-violet-400" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                    Select All
                                </button>
                                <p className="text-sm text-stone-500">
                                    Showing {filteredClients.length} of {clients.length} accounts
                                </p>
                            </div>

                            {/* Grid View */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredClients.map(client => (
                                        <ClientCard key={client.id} client={client} />
                                    ))}
                                </div>
                            )}

                            {/* List View - Click row to expand inline, no page navigation */}
                            {viewMode === 'list' && (
                                <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-800/50 text-xs font-semibold text-stone-400 uppercase">
                                        <div className="col-span-1"></div>
                                        <div className="col-span-3">Account</div>
                                        <div className="col-span-2">Type</div>
                                        <div className="col-span-2">Status</div>
                                        <div className="col-span-2">Quick Actions</div>
                                        <div className="col-span-2">Details</div>
                                    </div>
                                    {/* Rows */}
                                    {filteredClients.map(client => {
                                        const statusCfg = getStatusConfig(client.accountStatus)
                                        const StatusIcon = statusCfg.icon
                                        const isSelected = selectedIds.has(client.id)
                                        const isExpanded = expandedRowId === client.id

                                        return (
                                            <div key={client.id}>
                                                {/* Main Row */}
                                                <div className={`grid grid-cols-12 gap-2 px-4 py-3 border-t border-stone-800 hover:bg-stone-800/30 transition-colors ${isSelected ? 'bg-violet-500/10' : ''} ${isExpanded ? 'bg-stone-800/40' : ''}`}>
                                                    <div className="col-span-1 flex items-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleSelection(client.id)
                                                            }}
                                                            className="p-1"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="h-4 w-4 text-violet-400" />
                                                            ) : (
                                                                <Square className="h-4 w-4 text-stone-600 hover:text-stone-400" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="col-span-3 flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm">
                                                            {POS_MODES.find(m => m.id === client.posMode)?.icon || '🏪'}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="font-medium text-white text-sm truncate">{client.businessName}</p>
                                                            <p className="text-xs text-stone-500 truncate">{client.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 flex items-center">
                                                        <span className="text-xs text-stone-300">
                                                            {POS_MODES.find(m => m.id === client.posMode)?.name || client.posMode}
                                                        </span>
                                                    </div>
                                                    {/* Inline Status Dropdown - ONE CLICK to change! */}
                                                    <div className="col-span-2 flex items-center">
                                                        <select
                                                            value={client.accountStatus}
                                                            onChange={(e) => {
                                                                e.stopPropagation()
                                                                updateAccountStatus(client.id, e.target.value)
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer bg-${statusCfg.color}-500/20 text-${statusCfg.color}-400 focus:outline-none focus:ring-1 focus:ring-violet-500`}
                                                        >
                                                            {ACCOUNT_STATUSES.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {/* Quick Action Buttons */}
                                                    <div className="col-span-2 flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setExpandedRowId(isExpanded ? null : client.id)
                                                            }}
                                                            className="px-2 py-1 text-xs bg-stone-800 text-stone-300 rounded hover:bg-stone-700"
                                                            title="Expand details"
                                                        >
                                                            {isExpanded ? '▼' : '▶'} More
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedClient(client)
                                                                setCategoryView('history')
                                                            }}
                                                            className="px-2 py-1 text-xs bg-stone-800 text-stone-300 rounded hover:bg-stone-700"
                                                            title="View Activity Log"
                                                        >
                                                            📋
                                                        </button>
                                                    </div>
                                                    <div className="col-span-2 flex items-center gap-2 text-xs text-stone-400">
                                                        <span>{client.locationCount} store{client.locationCount !== 1 ? 's' : ''}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedClient(client)
                                                            }}
                                                            className="text-violet-400 hover:text-violet-300"
                                                        >
                                                            Full Config →
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded Inline Panel - NO PAGE NAVIGATION NEEDED */}
                                                {isExpanded && (
                                                    <div className="px-4 py-4 bg-stone-800/60 border-t border-stone-700/50">
                                                        <div className="grid grid-cols-4 gap-4">
                                                            {/* Quick Settings */}
                                                            <div className="bg-stone-900/50 rounded-lg p-3">
                                                                <h4 className="text-xs font-semibold text-stone-400 mb-2">POS Mode</h4>
                                                                <select
                                                                    value={client.posMode}
                                                                    onChange={(e) => updateConfig(client.id, { posMode: e.target.value })}
                                                                    className="w-full px-2 py-1 bg-stone-800 border border-stone-700 rounded text-sm text-white"
                                                                >
                                                                    {POS_MODES.map(m => (
                                                                        <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="bg-stone-900/50 rounded-lg p-3">
                                                                <h4 className="text-xs font-semibold text-stone-400 mb-2">Pricing</h4>
                                                                <select
                                                                    value={client.pricingModel}
                                                                    onChange={(e) => updateConfig(client.id, { pricingModel: e.target.value })}
                                                                    className="w-full px-2 py-1 bg-stone-800 border border-stone-700 rounded text-sm text-white"
                                                                >
                                                                    <option value="STANDARD">Standard</option>
                                                                    <option value="DUAL_PRICING">Dual Pricing</option>
                                                                </select>
                                                            </div>

                                                            <div className="bg-stone-900/50 rounded-lg p-3">
                                                                <h4 className="text-xs font-semibold text-stone-400 mb-2">Features</h4>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${client.features?.usesInventory ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-500'}`}>Inv</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${client.features?.usesAppointments ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-500'}`}>Appt</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${client.features?.usesLoyalty ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-500'}`}>Loyalty</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${client.pulseSeatCount > 0 ? 'bg-violet-500/20 text-violet-400' : 'bg-stone-700 text-stone-500'}`}>Pulse</span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-stone-900/50 rounded-lg p-3">
                                                                <h4 className="text-xs font-semibold text-stone-400 mb-2">Locations</h4>
                                                                <div className="space-y-1">
                                                                    {(client.locations || []).slice(0, 3).map((loc: any) => (
                                                                        <p key={loc.id} className="text-xs text-stone-300 truncate">{loc.name}</p>
                                                                    ))}
                                                                    {(client.locations?.length || 0) > 3 && (
                                                                        <p className="text-xs text-stone-500">+{client.locations.length - 3} more</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quick Toggle Features */}
                                                        <div className="mt-3 flex items-center gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={client.acceptsEbt}
                                                                    onChange={(e) => updateConfig(client.id, { acceptsEbt: e.target.checked })}
                                                                    className="w-4 h-4 rounded border-stone-600 text-violet-500 focus:ring-violet-500"
                                                                />
                                                                <span className="text-xs text-stone-300">EBT</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={client.acceptsChecks}
                                                                    onChange={(e) => updateConfig(client.id, { acceptsChecks: e.target.checked })}
                                                                    className="w-4 h-4 rounded border-stone-600 text-violet-500 focus:ring-violet-500"
                                                                />
                                                                <span className="text-xs text-stone-300">Checks</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={client.tipPromptEnabled}
                                                                    onChange={(e) => updateConfig(client.id, { tipPromptEnabled: e.target.checked })}
                                                                    className="w-4 h-4 rounded border-stone-600 text-violet-500 focus:ring-violet-500"
                                                                />
                                                                <span className="text-xs text-stone-300">Tips</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {filteredClients.length === 0 && (
                                <div className="text-center py-16">
                                    <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                    <p className="text-stone-500">No clients found</p>
                                    <p className="text-stone-600 text-sm mt-1">Try adjusting your filters</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add Station Modal */}
            {addStationModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4">Add New Station</h3>
                        <p className="text-stone-400 text-sm mb-4">Enter a name for the POS station (e.g., "Register 1", "Counter 2")</p>
                        <input
                            type="text"
                            value={stationName}
                            onChange={(e) => setStationName(e.target.value)}
                            placeholder="Station name"
                            className="w-full px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white placeholder:text-stone-500 focus:outline-none focus:border-purple-500 mb-4"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && stationName.trim()) {
                                    createStation(addStationModal.locationId, stationName.trim())
                                    setAddStationModal(null)
                                    setStationName('')
                                }
                            }}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setAddStationModal(null)
                                    setStationName('')
                                }}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (stationName.trim()) {
                                        createStation(addStationModal.locationId, stationName.trim())
                                        setAddStationModal(null)
                                        setStationName('')
                                    }
                                }}
                                disabled={!stationName.trim() || saving}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Adding...' : 'Add Station'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Station Created Success Modal */}
            {stationCreatedModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Station Created!</h3>
                                <p className="text-stone-400 text-sm">"{stationCreatedModal.name}" is ready</p>
                            </div>
                        </div>

                        <div className="bg-stone-900 rounded-lg p-4 mb-4">
                            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Pairing Code</p>
                            <div className="flex items-center gap-2">
                                <code className="text-2xl font-mono text-purple-400 tracking-widest">{stationCreatedModal.pairingCode}</code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(stationCreatedModal.pairingCode)
                                        setToast({ message: 'Pairing code copied!', type: 'success' })
                                    }}
                                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors text-stone-400 hover:text-white"
                                    title="Copy pairing code"
                                >
                                    📋
                                </button>
                            </div>
                        </div>

                        <p className="text-stone-500 text-sm mb-4">
                            Use this code to pair devices (like Pulse mobile app) to this station.
                        </p>

                        <button
                            onClick={() => setStationCreatedModal(null)}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Station Modal */}
            {editStationModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Edit2 className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Rename Station</h3>
                                <p className="text-stone-400 text-sm">Change the station display name</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={editStationName}
                            onChange={(e) => setEditStationName(e.target.value)}
                            placeholder="New station name"
                            className="w-full px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-blue-500 mb-4"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setEditStationModal(null)
                                    setEditStationName('')
                                }}
                                className="flex-1 py-3 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (editStationName.trim() && editStationModal.station) {
                                        editStation(editStationModal.station.id, editStationName.trim(), editStationModal.locationId)
                                    }
                                }}
                                disabled={saving || !editStationName.trim()}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Station Confirmation Modal */}
            {deleteStationModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Delete Station?</h3>
                                <p className="text-stone-400 text-sm">"{deleteStationModal.station.name}"</p>
                            </div>
                        </div>

                        <p className="text-stone-400 text-sm mb-4">
                            This will permanently remove this station. Any devices paired to it will need to be reconfigured.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteStationModal(null)}
                                className="flex-1 py-3 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteStationModal.station) {
                                        deleteStation(deleteStationModal.station.id, deleteStationModal.locationId)
                                    }
                                }}
                                disabled={saving}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium disabled:opacity-50"
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                >
                    <span className="text-white">{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="text-white/70 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}
        </RoleGuard>
    )
}

