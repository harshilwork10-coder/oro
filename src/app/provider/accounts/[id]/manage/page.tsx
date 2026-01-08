'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft, Building2, Users, CreditCard, Ban, Trash2, Download,
    CheckCircle, AlertTriangle, Clock, XCircle, Loader2
} from 'lucide-react'

type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PAYMENT_DUE' | 'PENDING_DELETION' | 'DELETED'

interface Franchise {
    id: string
    name: string
    slug: string
    accountStatus: AccountStatus
    suspendedAt?: string
    suspendedReason?: string
    scheduledDeletionAt?: string
    dataExportedAt?: string
    createdAt: string
    _count?: {
        users: number
        transactions: number
        products: number
    }
}

export default function AccountManagementPage() {
    const { data: session } = useSession()
    const params = useParams()
    const router = useRouter()
    const franchiseId = params.id as string

    const [franchise, setFranchise] = useState<Franchise | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [reason, setReason] = useState('')
    const [amountDue, setAmountDue] = useState('')

    useEffect(() => {
        fetchFranchise()
    }, [franchiseId])

    const fetchFranchise = async () => {
        try {
            const res = await fetch(`/api/admin/franchises/${franchiseId}`)
            const data = await res.json()
            setFranchise(data)
        } catch (e) {
            console.error('Failed to fetch franchise')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (action: string, endpoint: string, body: object = {}) => {
        if (!confirm(`Are you sure you want to ${action}?`)) return

        setActionLoading(action)
        try {
            const res = await fetch(`/api/admin/franchises/${franchiseId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (data.success) {
                alert(`✅ ${data.message}`)
                fetchFranchise()
            } else {
                alert(`❌ ${data.error}`)
            }
        } catch (e) {
            alert('Failed to perform action')
        } finally {
            setActionLoading(null)
        }
    }

    const handleExport = async () => {
        setActionLoading('export')
        try {
            const res = await fetch(`/api/admin/franchises/${franchiseId}/export-data`)
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `oro-export-${franchise?.slug}-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            alert('✅ Data exported successfully!')
            fetchFranchise()
        } catch (e) {
            alert('Failed to export data')
        } finally {
            setActionLoading(null)
        }
    }

    if (session?.user?.role !== 'PROVIDER') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <p className="text-red-400">Access denied. Provider only.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        )
    }

    if (!franchise) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <p className="text-gray-400">Franchise not found</p>
            </div>
        )
    }

    const statusColors: Record<AccountStatus, string> = {
        ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
        SUSPENDED: 'bg-red-500/20 text-red-400 border-red-500/30',
        PAYMENT_DUE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        PENDING_DELETION: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        DELETED: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    const statusIcons: Record<AccountStatus, React.ReactNode> = {
        ACTIVE: <CheckCircle className="w-5 h-5" />,
        SUSPENDED: <Ban className="w-5 h-5" />,
        PAYMENT_DUE: <CreditCard className="w-5 h-5" />,
        PENDING_DELETION: <Clock className="w-5 h-5" />,
        DELETED: <XCircle className="w-5 h-5" />
    }

    return (
        <div className="min-h-screen bg-stone-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-stone-800 rounded-lg text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-orange-500" />
                            {franchise.name}
                        </h1>
                        <p className="text-gray-400 text-sm">Account Management</p>
                    </div>
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${statusColors[franchise.accountStatus]}`}>
                        {statusIcons[franchise.accountStatus]}
                        {franchise.accountStatus.replace('_', ' ')}
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="text-white">{new Date(franchise.createdAt).toLocaleDateString()}</p>
                        </div>
                        {franchise.suspendedAt && (
                            <div>
                                <p className="text-xs text-gray-500">Suspended</p>
                                <p className="text-red-400">{new Date(franchise.suspendedAt).toLocaleDateString()}</p>
                            </div>
                        )}
                        {franchise.scheduledDeletionAt && (
                            <div>
                                <p className="text-xs text-gray-500">Deletion Scheduled</p>
                                <p className="text-purple-400">{new Date(franchise.scheduledDeletionAt).toLocaleDateString()}</p>
                            </div>
                        )}
                        {franchise.dataExportedAt && (
                            <div>
                                <p className="text-xs text-gray-500">Data Exported</p>
                                <p className="text-green-400">{new Date(franchise.dataExportedAt).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>
                    {franchise.suspendedReason && (
                        <div className="mt-4 p-3 bg-stone-800 rounded-lg">
                            <p className="text-xs text-gray-500">Reason</p>
                            <p className="text-gray-300">{franchise.suspendedReason}</p>
                        </div>
                    )}
                </div>

                {/* Actions Grid */}
                <div className="grid md:grid-cols-2 gap-4">

                    {/* Payment Due */}
                    <div className="bg-stone-900 border border-stone-700 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-amber-500" />
                            Payment Status
                        </h3>

                        {franchise.accountStatus !== 'PAYMENT_DUE' ? (
                            <div className="space-y-3">
                                <input
                                    type="number"
                                    placeholder="Amount due (e.g., 99.00)"
                                    value={amountDue}
                                    onChange={e => setAmountDue(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-white"
                                />
                                <button
                                    onClick={() => handleAction('mark payment due', 'payment', { action: 'mark_due', amountDue })}
                                    disabled={!!actionLoading || !amountDue}
                                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading === 'mark payment due' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Mark as Payment Due
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleAction('mark as paid', 'payment', { action: 'mark_paid' })}
                                disabled={!!actionLoading}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'mark as paid' && <Loader2 className="w-4 h-4 animate-spin" />}
                                <CheckCircle className="w-4 h-4" />
                                Mark as Paid (Restore Access)
                            </button>
                        )}
                    </div>

                    {/* Suspend Account */}
                    <div className="bg-stone-900 border border-stone-700 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-500" />
                            Account Suspension
                        </h3>

                        {franchise.accountStatus !== 'SUSPENDED' && franchise.accountStatus !== 'PENDING_DELETION' ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Reason for suspension"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-white"
                                />
                                <button
                                    onClick={() => handleAction('suspend account', 'suspend', { action: 'suspend', reason })}
                                    disabled={!!actionLoading}
                                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading === 'suspend account' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Suspend Account
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleAction('reactivate account', 'suspend', { action: 'unsuspend' })}
                                disabled={!!actionLoading}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'reactivate account' && <Loader2 className="w-4 h-4 animate-spin" />}
                                <CheckCircle className="w-4 h-4" />
                                Reactivate Account
                            </button>
                        )}
                    </div>

                    {/* Data Export */}
                    <div className="bg-stone-900 border border-stone-700 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5 text-blue-500" />
                            Data Export
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Download all client data as JSON for backup or migration.
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={!!actionLoading}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {actionLoading === 'export' && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Download className="w-4 h-4" />
                            Export All Data
                        </button>
                    </div>

                    {/* Schedule Deletion */}
                    <div className="bg-stone-900 border border-stone-700 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-purple-500" />
                            Account Deletion
                        </h3>

                        {franchise.accountStatus !== 'PENDING_DELETION' ? (
                            <>
                                <p className="text-gray-400 text-sm mb-4">
                                    Schedule permanent deletion. Client will have 30 days to export data.
                                </p>
                                <button
                                    onClick={() => handleAction('schedule deletion', 'delete', { action: 'schedule' })}
                                    disabled={!!actionLoading}
                                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading === 'schedule deletion' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Schedule 30-Day Deletion
                                </button>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                                    <p className="text-purple-300 text-sm">
                                        Deletion scheduled for {new Date(franchise.scheduledDeletionAt!).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAction('cancel deletion', 'delete', { action: 'cancel' })}
                                    disabled={!!actionLoading}
                                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    Cancel Deletion
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Danger Zone */}
                {franchise.accountStatus === 'PENDING_DELETION' && (
                    <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                        <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-red-300/70 text-sm mb-4">
                            Permanently delete all data. This action cannot be undone.
                        </p>
                        <button
                            onClick={async () => {
                                if (!confirm('⚠️ FINAL WARNING: This will permanently delete ALL data. Are you absolutely sure?')) return
                                if (!confirm('Type "DELETE" to confirm (this is your last chance to cancel)')) return

                                setActionLoading('delete')
                                try {
                                    const res = await fetch(`/api/admin/franchises/${franchiseId}/delete`, {
                                        method: 'DELETE'
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                        alert('Account deleted')
                                        router.push('/provider/accounts')
                                    } else {
                                        alert(`❌ ${data.error}`)
                                    }
                                } catch (e) {
                                    alert('Failed to delete')
                                } finally {
                                    setActionLoading(null)
                                }
                            }}
                            disabled={!!actionLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            Delete Now (Irreversible)
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
