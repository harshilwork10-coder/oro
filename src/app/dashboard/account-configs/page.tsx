'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Building2,
    Settings,
    Check,
    X,
    Search,
    ChevronLeft,
    Globe,
    Facebook,
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
    UserCheck
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

// Features
const AVAILABLE_FEATURES = [
    { id: 'usesServices', name: 'Services', icon: Calendar },
    { id: 'usesAppointments', name: 'Appointments', icon: Calendar },
    { id: 'usesScheduling', name: 'Staff Scheduling', icon: Users },
    { id: 'usesInventory', name: 'Inventory', icon: ShoppingBag },
    { id: 'usesLoyalty', name: 'Loyalty Program', icon: Heart },
    { id: 'usesGiftCards', name: 'Gift Cards', icon: Gift },
    { id: 'usesMemberships', name: 'Memberships', icon: Users },
    { id: 'usesEmailMarketing', name: 'Email Marketing', icon: Mail },
    { id: 'usesSmsMarketing', name: 'SMS Marketing', icon: MessageSquare },
    { id: 'usesReviewManagement', name: 'Reviews', icon: BarChart3 },
    { id: 'usesCommissions', name: 'Commissions', icon: CreditCard },
    { id: 'enableResources', name: 'Resources', icon: Building2 },
]

// Integrations
const AVAILABLE_INTEGRATIONS = [
    { id: 'googleBooking', name: 'Reserve with Google', icon: Globe },
    { id: 'facebookBooking', name: 'Facebook Booking', icon: Facebook },
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
}

type CategoryView = 'status' | 'sales' | 'pulse' | 'features' | 'integrations' | 'locations' | null

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

    useEffect(() => {
        if (status === 'authenticated') {
            fetchClients()
        }
    }, [status])

    // Fetch Pulse users when entering pulse view
    useEffect(() => {
        if (categoryView === 'pulse' && selectedClient) {
            fetchPulseUsers(selectedClient.id)
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
                        locations
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
                setClients(prev => prev.map(c =>
                    c.id === clientId
                        ? { ...c, ...updates, features: { ...c.features, ...updates } }
                        : c
                ))
                if (selectedClient?.id === clientId) {
                    setSelectedClient(prev => prev ? { ...prev, ...updates, features: { ...prev.features, ...updates } } : null)
                }
            }
        } catch (error) {
            console.error('Error updating config:', error)
        } finally {
            setSaving(false)
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

    const filteredClients = clients.filter(c =>
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
        const enabledFeatures = Object.entries(selectedClient.features).filter(([k, v]) => v && AVAILABLE_FEATURES.find(f => f.id === k)).length
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
                            Oro Pulse Access
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
                            {AVAILABLE_FEATURES.map(feature => {
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
                            <Link2 className="w-6 h-6 text-blue-400" />
                            Integrations
                        </h3>

                        <div className="space-y-3">
                            {AVAILABLE_INTEGRATIONS.map(integration => {
                                const isEnabled = selectedClient.integrations[integration.id] ?? false
                                const Icon = integration.icon
                                return (
                                    <div
                                        key={integration.id}
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${isEnabled
                                            ? 'bg-emerald-500/20 border-emerald-500/50'
                                            : 'bg-stone-800/50 border-stone-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-5 h-5 ${isEnabled ? 'text-emerald-400' : 'text-stone-500'}`} />
                                            <span className={isEnabled ? 'text-white' : 'text-stone-400'}>{integration.name}</span>
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
                                                <p className="text-stone-600 text-sm">No stations configured</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {location.stations.map(station => (
                                                        <div
                                                            key={station.id}
                                                            className={`p-3 rounded-lg border ${station.isActive
                                                                ? 'bg-stone-800 border-stone-600'
                                                                : 'bg-stone-900 border-stone-700 opacity-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-white">{station.name}</span>
                                                                {station.isActive ? (
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                ) : (
                                                                    <span className="text-xs text-stone-600">Inactive</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1">
                                                                <span className="text-xs text-stone-500">Pairing Code: </span>
                                                                {station.pairingCode ? (
                                                                    <span className="font-mono text-xs text-amber-400 font-bold">
                                                                        {station.pairingCode}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-stone-600">None</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                </div>
            )
        }

        // Main category cards view
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedClient(null)}
                    className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back to All Clients
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl">
                        {POS_MODES.find(m => m.id === selectedClient.posMode)?.icon || '🏪'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{selectedClient.businessName}</h2>
                        <p className="text-stone-400">{selectedClient.name} • {selectedClient.email}</p>
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
                            {/* Search */}
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {/* Client Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredClients.map(client => (
                                    <ClientCard key={client.id} client={client} />
                                ))}
                            </div>

                            {filteredClients.length === 0 && (
                                <div className="text-center py-16">
                                    <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                                    <p className="text-stone-500">No clients found</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </RoleGuard>
    )
}
