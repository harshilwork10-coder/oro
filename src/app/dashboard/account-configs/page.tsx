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
    ChevronDown,
    ChevronUp,
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
    Save,
    Copy,
    CheckCircle2
} from 'lucide-react'
import RoleGuard from '@/components/auth/RoleGuard'
import { Role } from '@/lib/permissions'

// Only PROVIDER can access
const ALLOWED_ROLES = [Role.PROVIDER]

// Available features that can be toggled per client
const AVAILABLE_FEATURES = [
    { id: 'usesServices', name: 'Services', icon: Calendar, description: 'Appointment booking and services' },
    { id: 'usesAppointments', name: 'Appointments', icon: Calendar, description: 'Appointment management' },
    { id: 'usesScheduling', name: 'Staff Scheduling', icon: Users, description: 'Employee schedule management' },
    { id: 'usesInventory', name: 'Inventory', icon: ShoppingBag, description: 'Product inventory tracking' },
    { id: 'usesLoyalty', name: 'Loyalty Program', icon: Heart, description: 'Customer retention rewards' },
    { id: 'usesGiftCards', name: 'Gift Cards', icon: Gift, description: 'Gift card sales & redemption' },
    { id: 'usesMemberships', name: 'Memberships', icon: Users, description: 'Recurring membership plans' },
    { id: 'usesEmailMarketing', name: 'Email Marketing', icon: Mail, description: 'AI-powered email campaigns' },
    { id: 'usesSmsMarketing', name: 'SMS Marketing', icon: MessageSquare, description: 'Text message campaigns' },
    { id: 'usesReviewManagement', name: 'Reviews', icon: BarChart3, description: 'Review collection & management' },
    { id: 'usesCommissions', name: 'Commissions', icon: CreditCard, description: 'Employee commission tracking' },
    { id: 'enableResources', name: 'Resources', icon: Building2, description: 'Room/resource booking' },
]

// Available integrations
const AVAILABLE_INTEGRATIONS = [
    { id: 'googleBooking', name: 'Reserve with Google', icon: Globe, description: 'Accept bookings from Google Search/Maps' },
    { id: 'facebookBooking', name: 'Facebook Booking', icon: Facebook, description: 'Accept bookings from Facebook page' },
]

interface Client {
    id: string
    name: string
    email: string
    businessName: string
    status: string
    features: Record<string, boolean>
    integrations: Record<string, boolean>
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
    const [expandedClient, setExpandedClient] = useState<string | null>(null)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        if (status === 'authenticated') {
            fetchClients()
        }
    }, [status])

    async function fetchClients() {
        try {
            const res = await fetch('/api/admin/franchisors')
            if (res.ok) {
                const data = await res.json()
                // Transform to our format with default features
                const transformed = data.map((client: any) => ({
                    id: client.id,
                    name: client.owner?.name || 'Unknown',
                    email: client.owner?.email || '',
                    businessName: client.businessName || client.name,
                    status: client.status || 'ACTIVE',
                    features: client.config || {},
                    integrations: client.integrations || {}
                }))
                setClients(transformed)
            }
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    async function toggleFeature(clientId: string, featureId: string, enabled: boolean) {
        setSaving(clientId)
        try {
            const res = await fetch(`/api/admin/franchisors/${clientId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [featureId]: enabled })
            })
            if (res.ok) {
                setClients(prev => prev.map(c =>
                    c.id === clientId
                        ? { ...c, features: { ...c.features, [featureId]: enabled } }
                        : c
                ))
            }
        } catch (error) {
            console.error('Error toggling feature:', error)
        } finally {
            setSaving(null)
        }
    }

    async function toggleIntegration(clientId: string, integrationId: string, enabled: boolean) {
        setSaving(clientId)
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
            }
        } catch (error) {
            console.error('Error toggling integration:', error)
        } finally {
            setSaving(null)
        }
    }

    const filteredClients = clients.filter(c =>
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const countEnabledFeatures = (client: Client) =>
        Object.values(client.features).filter(Boolean).length

    const countEnabledIntegrations = (client: Client) =>
        Object.values(client.integrations).filter(Boolean).length

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <RoleGuard allowedRoles={ALLOWED_ROLES}>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Account Configurations</h1>
                    <p className="text-stone-400">Manage features & integrations for each client (pay-as-you-go)</p>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                </div>

                {/* Client List */}
                <div className="space-y-4">
                    {filteredClients.length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No clients found</p>
                        </div>
                    ) : (
                        filteredClients.map((client) => (
                            <div
                                key={client.id}
                                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                            >
                                {/* Client Header */}
                                <button
                                    onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                                    className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{client.businessName}</h3>
                                            <p className="text-sm text-stone-400">{client.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm text-stone-500">Features</p>
                                            <p className="text-lg font-bold text-emerald-400">
                                                {countEnabledFeatures(client)}/{AVAILABLE_FEATURES.length}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-stone-500">Integrations</p>
                                            <p className="text-lg font-bold text-blue-400">
                                                {countEnabledIntegrations(client)}/{AVAILABLE_INTEGRATIONS.length}
                                            </p>
                                        </div>
                                        {saving === client.id ? (
                                            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                                        ) : expandedClient === client.id ? (
                                            <ChevronUp className="w-5 h-5 text-stone-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-stone-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Configuration */}
                                {expandedClient === client.id && (
                                    <div className="border-t border-white/10 p-6 space-y-6">
                                        {/* Features */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">
                                                Features (Toggle to enable/disable)
                                            </h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {AVAILABLE_FEATURES.map((feature) => {
                                                    const isEnabled = client.features[feature.id] ?? false
                                                    const Icon = feature.icon
                                                    return (
                                                        <button
                                                            key={feature.id}
                                                            onClick={() => toggleFeature(client.id, feature.id, !isEnabled)}
                                                            className={`p-4 rounded-xl border transition-all text-left ${isEnabled
                                                                ? 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30'
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
                                                            <p className="text-xs text-stone-500 mt-1">{feature.description}</p>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Integrations */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">
                                                Integrations (Premium Add-ons)
                                            </h4>
                                            <div className="space-y-3">
                                                {AVAILABLE_INTEGRATIONS.map((integration) => {
                                                    const isEnabled = client.integrations[integration.id] ?? false
                                                    const Icon = integration.icon
                                                    const webhookUrl = typeof window !== 'undefined'
                                                        ? `${window.location.origin}/api/integrations/${integration.id === 'googleBooking' ? 'google' : 'facebook'}-booking`
                                                        : ''
                                                    return (
                                                        <div
                                                            key={integration.id}
                                                            className={`p-4 rounded-xl border transition-all ${isEnabled
                                                                    ? 'bg-blue-500/20 border-blue-500/50'
                                                                    : 'bg-stone-800/50 border-stone-700'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <Icon className={`w-5 h-5 ${isEnabled ? 'text-blue-400' : 'text-stone-500'}`} />
                                                                    <div>
                                                                        <p className={`font-medium ${isEnabled ? 'text-white' : 'text-stone-400'}`}>
                                                                            {integration.name}
                                                                        </p>
                                                                        <p className="text-xs text-stone-500">{integration.description}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => toggleIntegration(client.id, integration.id, !isEnabled)}
                                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEnabled
                                                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                                            : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                                                                        }`}
                                                                >
                                                                    {isEnabled ? 'Enabled' : 'Enable'}
                                                                </button>
                                                            </div>

                                                            {/* Webhook URL when enabled */}
                                                            {isEnabled && (
                                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                                    <p className="text-xs text-stone-400 mb-2">Webhook URL (give to client for setup):</p>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            readOnly
                                                                            value={webhookUrl}
                                                                            className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-300 font-mono"
                                                                        />
                                                                        <button
                                                                            onClick={async () => {
                                                                                await navigator.clipboard.writeText(webhookUrl)
                                                                                alert('Webhook URL copied!')
                                                                            }}
                                                                            className="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors"
                                                                        >
                                                                            <Copy className="w-4 h-4 text-stone-300" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </RoleGuard>
    )
}
