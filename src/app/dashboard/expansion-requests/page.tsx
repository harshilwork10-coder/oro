'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Plus, MapPin, Clock, CheckCircle, XCircle, Send } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'

type ExpansionRequest = {
    id: string
    proposedName: string
    proposedAddress: string
    notes: string | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    responseNotes: string | null
    createdAt: string
    franchise: {
        name: string
    }
}

export default function ExpansionRequestsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [requests, setRequests] = useState<ExpansionRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [formData, setFormData] = useState({
        proposedName: '',
        proposedAddress: '',
        notes: ''
    })

    useEffect(() => {
        if (session?.user?.role === 'FRANCHISEE') {
            fetchRequests()
        }
    }, [session])

    async function fetchRequests() {
        try {
            const res = await fetch('/api/franchisee/expansion')
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)

        try {
            const res = await fetch('/api/franchisee/expansion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setToast({ message: 'Expansion request submitted!', type: 'success' })
                setFormData({ proposedName: '', proposedAddress: '', notes: '' })
                setIsModalOpen(false)
                fetchRequests()
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Failed to submit request', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    if (session?.user?.role !== 'FRANCHISEE') {
        redirect('/dashboard')
    }

    const pendingCount = requests.filter(r => r.status === 'PENDING').length
    const approvedCount = requests.filter(r => r.status === 'APPROVED').length

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
                        <Plus className="h-8 w-8 text-orange-500" />
                        Request Expansion
                    </h1>
                    <p className="text-stone-400 mt-2">
                        Request new locations from your franchisor.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-orange-900/40 hover:scale-105 transition-all"
                >
                    <Plus className="h-5 w-5" />
                    New Request
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-amber-400" />
                        <div>
                            <p className="text-sm text-stone-400">Pending</p>
                            <p className="text-2xl font-bold text-stone-100">{pendingCount}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                        <div>
                            <p className="text-sm text-stone-400">Approved</p>
                            <p className="text-2xl font-bold text-stone-100">{approvedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <Send className="h-6 w-6 text-blue-400" />
                        <div>
                            <p className="text-sm text-stone-400">Total Requests</p>
                            <p className="text-2xl font-bold text-stone-100">{requests.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="glass-panel p-12 rounded-2xl text-center">
                        <MapPin className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400 font-medium">No expansion requests yet</p>
                        <p className="text-stone-500 text-sm mt-1">
                            Click "New Request" to request a new location.
                        </p>
                    </div>
                ) : (
                    requests.map(request => (
                        <div
                            key={request.id}
                            className={`glass-panel p-6 rounded-2xl border transition-all ${request.status === 'PENDING'
                                    ? 'border-amber-500/30'
                                    : request.status === 'APPROVED'
                                        ? 'border-emerald-500/30'
                                        : 'border-red-500/30'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${request.status === 'PENDING'
                                            ? 'bg-amber-500/20'
                                            : request.status === 'APPROVED'
                                                ? 'bg-emerald-500/20'
                                                : 'bg-red-500/20'
                                        }`}>
                                        {request.status === 'PENDING' ? (
                                            <Clock className="h-6 w-6 text-amber-400" />
                                        ) : request.status === 'APPROVED' ? (
                                            <CheckCircle className="h-6 w-6 text-emerald-400" />
                                        ) : (
                                            <XCircle className="h-6 w-6 text-red-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100">
                                            {request.proposedName}
                                        </h3>
                                        <p className="text-sm text-stone-400">
                                            {request.proposedAddress}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                                                {request.franchise.name}
                                            </span>
                                            <span className="text-xs text-stone-500">
                                                {new Date(request.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <span className={`px-4 py-2 rounded-lg font-medium text-sm ${request.status === 'PENDING'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : request.status === 'APPROVED'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {request.status === 'PENDING' && 'Awaiting Review'}
                                    {request.status === 'APPROVED' && '✓ Approved'}
                                    {request.status === 'REJECTED' && 'Rejected'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Request Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Request New Location"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Proposed Location Name *
                        </label>
                        <input
                            type="text"
                            value={formData.proposedName}
                            onChange={(e) => setFormData({ ...formData, proposedName: e.target.value })}
                            required
                            placeholder="e.g., McDonald's Austin"
                            className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Proposed Address *
                        </label>
                        <input
                            type="text"
                            value={formData.proposedAddress}
                            onChange={(e) => setFormData({ ...formData, proposedAddress: e.target.value })}
                            required
                            placeholder="123 Main St, Austin, TX 78701"
                            className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Additional Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            placeholder="Why you want this location, expected opening date, etc."
                            className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Submit Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
