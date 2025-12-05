'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Package,
    Check,
    Lock,
    Send,
    MapPin,
    Calendar,
    Heart,
    Gift,
    Crown,
    Mail,
    MessageSquare,
    Percent,
    CreditCard,
    ShoppingBag,
    Briefcase,
    CheckCircle,
    Clock
} from 'lucide-react'
import Toast from '@/components/ui/Toast'

type FeatureConfig = {
    usesMultiLocation: boolean
    usesScheduling: boolean
    usesAppointments: boolean
    usesServices: boolean
    usesInventory: boolean
    usesLoyalty: boolean
    usesGiftCards: boolean
    usesMemberships: boolean
    usesEmailMarketing: boolean
    usesReviewManagement: boolean
    usesCommissions: boolean
}

type FeatureRequest = {
    id: string
    featureKey: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
}

const AVAILABLE_FEATURES = [
    {
        key: 'usesMultiLocation',
        name: 'Multi-Location Management',
        description: 'Manage multiple business locations from one dashboard',
        icon: MapPin,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
    },
    {
        key: 'usesScheduling',
        name: 'Staff Scheduling',
        description: 'Create and manage employee work schedules',
        icon: Calendar,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20'
    },
    {
        key: 'usesAppointments',
        name: 'Appointment Booking',
        description: 'Online booking system for customers',
        icon: Calendar,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
    },
    {
        key: 'usesServices',
        name: 'Services Menu',
        description: 'Manage your service offerings and pricing',
        icon: Briefcase,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20'
    },
    {
        key: 'usesInventory',
        name: 'Inventory Management',
        description: 'Track stock levels and purchase orders',
        icon: ShoppingBag,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
    },
    {
        key: 'usesLoyalty',
        name: 'Loyalty Program',
        description: 'Reward repeat customers with points and perks',
        icon: Heart,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20'
    },
    {
        key: 'usesGiftCards',
        name: 'Gift Cards',
        description: 'Sell and redeem digital gift cards',
        icon: Gift,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20'
    },
    {
        key: 'usesMemberships',
        name: 'Memberships',
        description: 'Recurring membership subscriptions',
        icon: Crown,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20'
    },
    {
        key: 'usesEmailMarketing',
        name: 'Email Marketing',
        description: 'Send promotional emails and campaigns',
        icon: Mail,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20'
    },
    {
        key: 'usesReviewManagement',
        name: 'Review Management',
        description: 'Monitor and respond to customer reviews',
        icon: MessageSquare,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
    },
    {
        key: 'usesCommissions',
        name: 'Commission Tracking',
        description: 'Calculate and track employee commissions',
        icon: Percent,
        color: 'text-lime-400',
        bg: 'bg-lime-500/10',
        border: 'border-lime-500/20'
    }
]

export default function FeaturesPage() {
    const { data: session } = useSession()
    const [config, setConfig] = useState<FeatureConfig | null>(null)
    const [requests, setRequests] = useState<FeatureRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [requesting, setRequesting] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchConfig()
        fetchRequests()
    }, [])

    async function fetchConfig() {
        try {
            const res = await fetch('/api/business-config')
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
            }
        } catch (error) {
            console.error('Error fetching config:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchRequests() {
        try {
            const res = await fetch('/api/feature-requests')
            if (res.ok) {
                const data = await res.json()
                setRequests(data)
            }
        } catch (error) {
            console.error('Error fetching requests:', error)
        }
    }

    async function requestFeature(featureKey: string) {
        setRequesting(featureKey)
        try {
            const res = await fetch('/api/feature-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureKey })
            })

            if (res.ok) {
                setToast({ message: 'Feature request submitted! We\'ll review it shortly.', type: 'success' })
                fetchRequests()
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Failed to submit request', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        } finally {
            setRequesting(null)
        }
    }

    function getFeatureStatus(featureKey: string): 'active' | 'pending' | 'locked' {
        // Check if feature is already enabled
        if (config && config[featureKey as keyof FeatureConfig]) {
            return 'active'
        }
        // Check if there's a pending request
        const pendingRequest = requests.find(r => r.featureKey === featureKey && r.status === 'PENDING')
        if (pendingRequest) {
            return 'pending'
        }
        return 'locked'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <Package className="h-8 w-8 text-orange-500" />
                    Features & Add-ons
                </h1>
                <p className="text-stone-400 mt-2">
                    Discover available features for your business. Request access to unlock new capabilities.
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AVAILABLE_FEATURES.map(feature => {
                    const status = getFeatureStatus(feature.key)
                    const Icon = feature.icon

                    return (
                        <div
                            key={feature.key}
                            className={`glass-panel p-6 rounded-2xl border transition-all ${status === 'active'
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : status === 'pending'
                                        ? 'border-amber-500/30 bg-amber-500/5'
                                        : 'border-stone-700 hover:border-stone-600'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${feature.bg} ${feature.border} border`}>
                                    <Icon className={`h-6 w-6 ${feature.color}`} />
                                </div>

                                {status === 'active' && (
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Active
                                    </span>
                                )}
                                {status === 'pending' && (
                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium border border-amber-500/20 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Pending
                                    </span>
                                )}
                                {status === 'locked' && (
                                    <span className="px-3 py-1 bg-stone-800 text-stone-400 rounded-full text-xs font-medium border border-stone-700 flex items-center gap-1">
                                        <Lock className="h-3 w-3" /> Locked
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-semibold text-stone-100 mb-2">
                                {feature.name}
                            </h3>
                            <p className="text-sm text-stone-400 mb-4">
                                {feature.description}
                            </p>

                            {status === 'locked' && (
                                <button
                                    onClick={() => requestFeature(feature.key)}
                                    disabled={requesting === feature.key}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {requesting === feature.key ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Request Access
                                        </>
                                    )}
                                </button>
                            )}

                            {status === 'active' && (
                                <div className="w-full py-2 px-4 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium text-center border border-emerald-500/20">
                                    ✓ Available in your plan
                                </div>
                            )}

                            {status === 'pending' && (
                                <div className="w-full py-2 px-4 bg-amber-500/10 text-amber-400 rounded-lg font-medium text-center border border-amber-500/20">
                                    Awaiting approval...
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Info Box */}
            <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Need Help?</h3>
                <p className="text-stone-400">
                    Contact your account manager to discuss which features would best suit your business needs.
                    Some features may require additional setup or training.
                </p>
            </div>
        </div>
    )
}
