'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Package,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    Filter,
    Search
} from 'lucide-react'
import Toast from '@/components/ui/Toast'

type FeatureRequest = {
    id: string
    featureKey: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    requestNotes?: string
    responseNotes?: string
    createdAt: string
    franchisor: {
        id: string
        name: string
        owner: {
            name: string
            email: string
        }
    }
}

const FEATURE_NAMES: Record<string, string> = {
    usesMultiLocation: 'Multi-Location Management',
    usesScheduling: 'Staff Scheduling',
    usesAppointments: 'Appointment Booking',
    usesServices: 'Services Menu',
    usesInventory: 'Inventory Management',
    usesLoyalty: 'Loyalty Program',
    usesGiftCards: 'Gift Cards',
    usesMemberships: 'Memberships',
    usesEmailMarketing: 'Email Marketing',
    usesReviewManagement: 'Review Management',
    usesCommissions: 'Commission Tracking'
}

export default function FeatureRequestsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [requests, setRequests] = useState<FeatureRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (session?.user?.role === 'PROVIDER') {
            fetchRequests()
        }
    }, [session])

    async function fetchRequests() {
        try {
            const res = await fetch('/api/admin/feature-requests')
            if (res.ok) {
                const data = await res.json()
                setRequests(data)
            }
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAction(requestId: string, action: 'APPROVE' | 'REJECT') {
        setProcessing(requestId)
        try {
            const res = await fetch('/api/admin/feature-requests/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action })
            })

            if (res.ok) {
                setToast({
                    message: action === 'APPROVE'
                        ? 'Feature request approved! Client can now access this feature.'
                        : 'Feature request rejected.',
                    type: 'success'
                })
                fetchRequests()
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Action failed', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        } finally {
            setProcessing(null)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    if (session?.user?.role !== 'PROVIDER') {
        redirect('/dashboard')
    }

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'ALL' || req.status === filter
        const matchesSearch = searchQuery === '' ||
            req.franchisor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.franchisor.owner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            FEATURE_NAMES[req.featureKey]?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const pendingCount = requests.filter(r => r.status === 'PENDING').length

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Package className="h-8 w-8 text-orange-500" />
                        Feature Requests
                        {pendingCount > 0 && (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
                                {pendingCount} pending
                            </span>
                        )}
                    </h1>
                    <p className="text-stone-400 mt-2">
                        Review and manage feature access requests from your clients.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search by client, owner, or feature..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                </div>

                <div className="flex bg-stone-800 rounded-lg p-1">
                    {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-orange-600 text-white'
                                    : 'text-stone-400 hover:text-white'
                                }`}
                        >
                            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="glass-panel p-12 rounded-2xl text-center">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400 font-medium">No feature requests found</p>
                        <p className="text-stone-500 text-sm mt-1">
                            {filter === 'PENDING'
                                ? 'All requests have been processed!'
                                : 'No requests match your filters.'}
                        </p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <div
                            key={request.id}
                            className={`glass-panel p-6 rounded-2xl border transition-all ${request.status === 'PENDING'
                                    ? 'border-amber-500/30 bg-amber-500/5'
                                    : request.status === 'APPROVED'
                                        ? 'border-emerald-500/20'
                                        : 'border-red-500/20'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-stone-800 rounded-xl flex items-center justify-center">
                                        <Building2 className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100">
                                            {request.franchisor.name || 'Unnamed Business'}
                                        </h3>
                                        <p className="text-sm text-stone-400">
                                            {request.franchisor.owner.name} • {request.franchisor.owner.email}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                                                {FEATURE_NAMES[request.featureKey] || request.featureKey}
                                            </span>
                                            <span className="text-xs text-stone-500">
                                                Requested {new Date(request.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {request.status === 'PENDING' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(request.id, 'REJECT')}
                                                disabled={processing === request.id}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-all flex items-center gap-2 border border-red-500/20"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(request.id, 'APPROVE')}
                                                disabled={processing === request.id}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {processing === request.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                ) : (
                                                    <CheckCircle className="h-4 w-4" />
                                                )}
                                                Approve
                                            </button>
                                        </>
                                    ) : request.status === 'APPROVED' ? (
                                        <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium flex items-center gap-2 border border-emerald-500/20">
                                            <CheckCircle className="h-4 w-4" />
                                            Approved
                                        </span>
                                    ) : (
                                        <span className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg font-medium flex items-center gap-2 border border-red-500/20">
                                            <XCircle className="h-4 w-4" />
                                            Rejected
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
