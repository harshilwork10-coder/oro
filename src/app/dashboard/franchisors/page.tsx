'use client'

import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Building2, Plus, Search, MoreVertical, Eye, Trash2, Download, Settings, AlertTriangle, X, CheckCircle, Clock, XCircle, Key, EyeOff, Pause, Play, Ban, ChevronDown, ChevronUp, MapPin, FileCheck, FileX } from "lucide-react"
import AddFranchisorModal from "@/components/modals/AddFranchisorModal"
import AddLocationModal from "@/components/modals/AddLocationModal"
import Toast from "@/components/ui/Toast"

type Location = {
    id: string
    name: string
    address: string | null
    slug: string
    voidCheckUrl?: string | null  // Per-location document status
    _count: {
        stations: number
    }
}

type Franchise = {
    id: string
    name: string
    locations: Location[]
}

type Franchisor = {
    id: string
    name: string
    approvalStatus?: string
    accountStatus?: string  // ACTIVE, SUSPENDED, TERMINATED
    suspendedReason?: string
    // Document status
    voidCheckUrl?: string | null
    driverLicenseUrl?: string | null
    feinLetterUrl?: string | null
    owner: {
        name: string
        email: string
        magicLinks?: Array<{ token: string }>
    }
    franchises?: Franchise[]
    _count: {
        franchises: number
    }
    createdAt: string
}

export default function MyClientsPage() {
    const router = useRouter()
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [franchisors, setFranchisors] = useState<Franchisor[]>([])
    const [filteredClients, setFilteredClients] = useState<Franchisor[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [reminderConfirm, setReminderConfirm] = useState<{ id: string; name: string; missingDocs: string[] } | null>(null)
    const [sendingReminder, setSendingReminder] = useState(false)
    const [passwordModal, setPasswordModal] = useState<{ open: boolean; ownerId: string; ownerName: string } | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [resettingPassword, setResettingPassword] = useState(false)
    const [suspendModal, setSuspendModal] = useState<{ id: string; name: string; action: 'SUSPEND' | 'ACTIVATE' | 'TERMINATE' } | null>(null)
    const [suspendReason, setSuspendReason] = useState('')
    const [suspending, setSuspending] = useState(false)
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
    const [addLocationModal, setAddLocationModal] = useState<{ id: string; name: string } | null>(null)


    async function fetchFranchisors() {
        try {
            const response = await fetch('/api/franchisors')
            if (response.ok) {
                const json = await response.json()
                // Handle both array (legacy) and paginated response
                const clients = Array.isArray(json) ? json : json.data || []
                setFranchisors(clients)
                setFilteredClients(clients)
            }
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        setDeleteConfirm({ id, name })
    }

    async function confirmDelete() {
        if (!deleteConfirm) return

        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/clients/${deleteConfirm.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setToast({ message: `${deleteConfirm.name} deleted successfully`, type: 'success' })
                fetchFranchisors()
            } else {
                const error = await res.json()
                setToast({ message: error.details || 'Failed to delete client', type: 'error' })
            }
        } catch (error) {
            console.error('Error deleting client:', error)
            setToast({ message: 'An error occurred while deleting', type: 'error' })
        } finally {
            setDeleting(false)
            setDeleteConfirm(null)
        }
    }

    async function handleExport() {
        try {
            const res = await fetch('/api/admin/clients/export')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
        } catch (error) {
            console.error('Error exporting:', error)
        }
    }

    async function handleApprove(id: string, name: string, action: 'APPROVE' | 'REJECT') {
        try {
            const res = await fetch('/api/admin/franchisors/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ franchisorId: id, action })
            })

            if (res.ok) {
                setToast({
                    message: `${name} ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
                    type: 'success'
                })
                fetchFranchisors()
            } else {
                const errorData = await res.json()
                // Check if this is a missing documents error - show reminder dialog
                if (errorData.canSendReminder && errorData.missingFields) {
                    setReminderConfirm({ id, name, missingDocs: errorData.missingFields })
                } else {
                    const errorMessage = errorData.message || errorData.error || `Failed to ${action.toLowerCase()} client`
                    setToast({ message: errorMessage, type: 'error' })
                }
            }
        } catch (error) {
            console.error('Error approving client:', error)
            setToast({ message: 'An error occurred', type: 'error' })
        }
        setActiveMenu(null)
    }

    async function sendReminder(id: string, name: string) {
        setSendingReminder(true)
        try {
            const res = await fetch('/api/admin/franchisors/send-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ franchisorId: id })
            })

            if (res.ok) {
                setToast({ message: `Reminder email sent to ${name}`, type: 'success' })
            } else {
                setToast({ message: 'Failed to send reminder', type: 'error' })
            }
        } catch (error) {
            console.error('Error sending reminder:', error)
            setToast({ message: 'Error sending reminder', type: 'error' })
        } finally {
            setSendingReminder(false)
            setReminderConfirm(null)
        }
    }

    async function handleResetOwnerPassword() {
        if (!passwordModal) return
        if (newPassword.length < 8) return

        setResettingPassword(true)
        try {
            const res = await fetch('/api/admin/reset-owner-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: passwordModal.ownerId, password: newPassword })
            })

            if (res.ok) {
                setToast({ message: `Password reset for ${passwordModal.ownerName}`, type: 'success' })
                setPasswordModal(null)
                setNewPassword('')
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to reset password', type: 'error' })
            }
        } catch (error) {
            console.error('Error resetting password:', error)
            setToast({ message: 'Error resetting password', type: 'error' })
        } finally {
            setResettingPassword(false)
        }
    }

    async function handleSuspendAccount() {
        if (!suspendModal) return

        setSuspending(true)
        try {
            const res = await fetch('/api/admin/franchisors/suspend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchisorId: suspendModal.id,
                    action: suspendModal.action,
                    reason: suspendReason || undefined
                })
            })

            if (res.ok) {
                const actionText = suspendModal.action === 'SUSPEND' ? 'suspended' :
                    suspendModal.action === 'ACTIVATE' ? 'reactivated' : 'terminated'
                setToast({ message: `${suspendModal.name} has been ${actionText}`, type: 'success' })
                setSuspendModal(null)
                setSuspendReason('')
                fetchFranchisors()
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to update account status', type: 'error' })
            }
        } catch (error) {
            console.error('Error updating account status:', error)
            setToast({ message: 'Error updating account status', type: 'error' })
        } finally {
            setSuspending(false)
        }
    }

    // Toggle expand/collapse for client cards
    function toggleExpand(clientId: string) {
        setExpandedClients(prev => {
            const newSet = new Set(prev)
            if (newSet.has(clientId)) {
                newSet.delete(clientId)
            } else {
                newSet.add(clientId)
            }
            return newSet
        })
    }

    // Get all locations for a client
    function getClientLocations(client: Franchisor): Location[] {
        return client.franchises?.flatMap(f => f.locations) || []
    }

    // Filter and search logic
    useEffect(() => {
        let result = [...franchisors]

        // Search
        if (searchQuery) {
            result = result.filter(client =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.owner.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Sort
        if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        } else if (sortBy === 'oldest') {
            result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        } else if (sortBy === 'mostLocations') {
            result.sort((a, b) => b._count.franchises - a._count.franchises)
        }

        setFilteredClients(result)
    }, [searchQuery, sortBy, franchisors])

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFranchisors()
        }
    }, [status])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Clients</h1>
                    <p className="text-stone-400 mt-2">Manage your salon owner clients</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-105 transition-all font-medium flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-panel p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search clients by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="mostLocations">Most Locations</option>
                    </select>
                </div>

                {/* Results count */}
                <div className="text-sm text-stone-400">
                    Showing {filteredClients.length} of {franchisors.length} clients
                </div>
            </div>

            {/* Modals */}
            <AddFranchisorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchFranchisors()
                    setIsAddModalOpen(false)
                }}
            />

            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <div key={client.id} className="glass-panel p-6 rounded-2xl hover:border-purple-500/30 transition-all group relative overflow-visible">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                        <div className="flex items-start justify-between mb-6 relative z-20">
                            <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                <Building2 className="h-6 w-6 text-purple-400" />
                            </div>

                            {/* Action Menu */}
                            <div
                                className="relative z-50"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveMenu(activeMenu === client.id ? null : client.id)
                                    }}
                                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5 text-stone-400" />
                                </button>

                                {activeMenu === client.id && (
                                    <div className="absolute right-0 mt-2 w-48 glass-panel rounded-lg shadow-lg border border-stone-700 overflow-hidden z-50 bg-stone-900/95 backdrop-blur-xl">
                                        {/* Approve for pending clients */}
                                        {(!client.approvalStatus || client.approvalStatus === 'PENDING') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleApprove(client.id, client.name, 'APPROVE')
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-emerald-900/20 transition-colors flex items-center gap-2 text-emerald-400"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Approve
                                            </button>
                                        )}

                                        {/* Manage - Main Action */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/account-configs?client=${client.id}`)
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-orange-400"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Manage
                                        </button>

                                        {/* Reset Password */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPasswordModal({
                                                    open: true,
                                                    ownerId: (client as any).ownerId || client.id,
                                                    ownerName: client.owner?.name || client.name
                                                })
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-stone-300"
                                        >
                                            <Key className="h-4 w-4" />
                                            Reset Password
                                        </button>

                                        {/* Copy Magic Link */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                const magicToken = client.owner?.magicLinks?.[0]?.token
                                                if (magicToken) {
                                                    const url = `${window.location.origin}/auth/magic-link/${magicToken}`
                                                    await navigator.clipboard.writeText(url)
                                                    setToast({ message: 'Magic link copied!', type: 'success' })
                                                } else {
                                                    // Generate new magic link
                                                    try {
                                                        const res = await fetch(`/api/admin/franchisors/${client.id}/magic-link`, { method: 'POST' })
                                                        const data = await res.json()
                                                        if (data.url) {
                                                            await navigator.clipboard.writeText(data.url)
                                                            setToast({ message: 'Magic link generated and copied!', type: 'success' })
                                                        } else {
                                                            setToast({ message: 'Failed to generate magic link', type: 'error' })
                                                        }
                                                    } catch {
                                                        setToast({ message: 'Failed to generate magic link', type: 'error' })
                                                    }
                                                }
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-blue-400"
                                        >
                                            <Download className="h-4 w-4" />
                                            Copy Magic Link
                                        </button>

                                        {/* Suspend / Activate */}
                                        {client.accountStatus !== 'SUSPENDED' && client.accountStatus !== 'TERMINATED' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSuspendModal({ id: client.id, name: client.name || 'Unknown', action: 'SUSPEND' })
                                                    setActiveMenu(null)
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-orange-900/20 transition-colors flex items-center gap-2 text-orange-400"
                                            >
                                                <Pause className="h-4 w-4" />
                                                Suspend
                                            </button>
                                        )}
                                        {client.accountStatus === 'SUSPENDED' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSuspendModal({ id: client.id, name: client.name || 'Unknown', action: 'ACTIVATE' })
                                                    setActiveMenu(null)
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-emerald-900/20 transition-colors flex items-center gap-2 text-emerald-400"
                                            >
                                                <Play className="h-4 w-4" />
                                                Reactivate
                                            </button>
                                        )}

                                        {/* Delete - Red/Dangerous */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(client.id, client.name)
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-red-900/20 transition-colors flex items-center gap-2 text-red-400 border-t border-stone-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="block relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-stone-100">{client.owner?.name || 'Unknown Owner'}</h3>
                                {/* Status Badge */}
                                {(!client.approvalStatus || client.approvalStatus === 'PENDING') && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Pending
                                    </span>
                                )}
                                {client.approvalStatus === 'APPROVED' && client.accountStatus !== 'SUSPENDED' && client.accountStatus !== 'TERMINATED' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Active
                                    </span>
                                )}
                                {client.approvalStatus === 'REJECTED' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> Rejected
                                    </span>
                                )}
                                {client.accountStatus === 'SUSPENDED' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full flex items-center gap-1">
                                        <Pause className="h-3 w-3" /> Suspended
                                    </span>
                                )}
                                {client.accountStatus === 'TERMINATED' && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-500 rounded-full flex items-center gap-1">
                                        <Ban className="h-3 w-3" /> Terminated
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-stone-400 mb-4">🏢 {client.name}</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center text-sm">
                                    <Building2 className="h-4 w-4 text-stone-500 mr-2" />
                                    <span className="text-stone-300">{client._count.franchises} Location{client._count.franchises !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-stone-500 mr-2">📧</span>
                                    <span className="text-stone-400 truncate">{client.owner.email}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-stone-500 mr-2">📅</span>
                                    <span className="text-stone-400">
                                        Joined {new Date(client.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Expand/Collapse Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(client.id)
                                }}
                                className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {expandedClients.has(client.id) ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Hide Locations
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        Show {getClientLocations(client).length} Location{getClientLocations(client).length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>

                            {/* Expanded Locations Panel */}
                            {expandedClients.has(client.id) && (
                                <div className="mt-4 pt-4 border-t border-stone-700 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-stone-300">Documents</h4>
                                    </div>

                                    {/* Document Status Grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-4 p-2 bg-stone-800/50 rounded-lg">
                                        <div className="text-center">
                                            <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${client.voidCheckUrl ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
                                                {client.voidCheckUrl ? (
                                                    <FileCheck className="h-4 w-4 text-emerald-400" />
                                                ) : (
                                                    <FileX className="h-4 w-4 text-orange-400" />
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-400 mt-1">Void Check</p>
                                        </div>
                                        <div className="text-center">
                                            <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${client.driverLicenseUrl ? 'bg-emerald-500/20' : 'bg-stone-700'}`}>
                                                {client.driverLicenseUrl ? (
                                                    <FileCheck className="h-4 w-4 text-emerald-400" />
                                                ) : (
                                                    <FileX className="h-4 w-4 text-stone-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-400 mt-1">License</p>
                                        </div>
                                        <div className="text-center">
                                            <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${client.feinLetterUrl ? 'bg-emerald-500/20' : 'bg-stone-700'}`}>
                                                {client.feinLetterUrl ? (
                                                    <FileCheck className="h-4 w-4 text-emerald-400" />
                                                ) : (
                                                    <FileX className="h-4 w-4 text-stone-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-400 mt-1">FEIN</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-stone-300">Locations</h4>
                                    </div>

                                    {getClientLocations(client).length === 0 ? (
                                        <p className="text-sm text-stone-500 py-2">No locations yet</p>
                                    ) : (
                                        getClientLocations(client).map(location => (
                                            <div
                                                key={location.id}
                                                className="p-3 bg-stone-800/50 rounded-lg border border-stone-700/50 hover:border-purple-500/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                                            <span className="font-medium text-stone-200 truncate">{location.name}</span>
                                                        </div>
                                                        {location.address && (
                                                            <p className="text-xs text-stone-500 mt-1 ml-6 truncate">{location.address}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {/* Per-location document status */}
                                                        {location.voidCheckUrl ? (
                                                            <span className="flex items-center gap-0.5 text-xs text-emerald-400" title="Void Check Uploaded">
                                                                <FileCheck className="h-3 w-3" />
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-0.5 text-xs text-orange-400" title="Missing Void Check">
                                                                <FileX className="h-3 w-3" />
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-stone-500">
                                                            {location._count.stations} station{location._count.stations !== 1 ? 's' : ''}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                router.push(`/dashboard/account-configs?client=${client.id}&location=${location.id}`)
                                                            }}
                                                            className="p-1.5 hover:bg-stone-700 rounded-lg transition-colors"
                                                            title="Configure Location"
                                                        >
                                                            <Settings className="h-3.5 w-3.5 text-stone-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* Add Location Button - Generate Magic Link */}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            try {
                                                const res = await fetch(`/api/admin/franchisors/${client.id}/location-link`, { method: 'POST' })
                                                const data = await res.json()
                                                if (data.url) {
                                                    await navigator.clipboard.writeText(data.url)
                                                    setToast({ message: 'Location onboarding link copied! Send to owner.', type: 'success' })
                                                } else {
                                                    setToast({ message: data.error || 'Failed to generate link', type: 'error' })
                                                }
                                            } catch {
                                                setToast({ message: 'Failed to generate link', type: 'error' })
                                            }
                                        }}
                                        className="w-full py-2 mt-2 border border-dashed border-stone-600 hover:border-purple-500 text-stone-400 hover:text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Get Location Onboarding Link
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-stone-400">No clients found matching your search</p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Delete Client</h3>
                        </div>
                        <p className="text-stone-300 mb-2">
                            Are you sure you want to delete <span className="font-semibold text-white">{deleteConfirm.name}</span>?
                        </p>
                        <p className="text-stone-400 text-sm mb-6">
                            This action cannot be undone. All franchises, locations, employees, and data associated with this client will be permanently deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>Delete Client</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reminder Confirmation Modal */}
            {reminderConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-500/20 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-orange-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Documents Pending</h3>
                        </div>
                        <p className="text-stone-300 mb-2">
                            <span className="font-semibold text-white">{reminderConfirm.name}</span> has not uploaded required documents:
                        </p>
                        <ul className="text-orange-400 text-sm mb-4 list-disc list-inside">
                            {reminderConfirm.missingDocs.map((doc, i) => (
                                <li key={i}>{doc}</li>
                            ))}
                        </ul>
                        <p className="text-stone-400 text-sm mb-6">
                            Would you like to send them a reminder email with the link to complete their onboarding?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setReminderConfirm(null)}
                                disabled={sendingReminder}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => sendReminder(reminderConfirm.id, reminderConfirm.name)}
                                disabled={sendingReminder}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {sendingReminder ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>Send Reminder</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {passwordModal?.open && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Key className="h-6 w-6 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">Reset Password</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setPasswordModal(null)
                                    setNewPassword('')
                                    setShowPassword(false)
                                }}
                                className="p-1 hover:bg-stone-700 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>
                        <p className="text-stone-300 mb-4">
                            Set a new password for <span className="font-semibold text-white">{passwordModal.ownerName}</span>
                        </p>
                        <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-700 rounded transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-stone-400" />
                                ) : (
                                    <Eye className="h-5 w-5 text-stone-400" />
                                )}
                            </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-red-400 text-sm mb-4">Password must be at least 8 characters</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setPasswordModal(null)
                                    setNewPassword('')
                                    setShowPassword(false)
                                }}
                                disabled={resettingPassword}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetOwnerPassword}
                                disabled={resettingPassword || newPassword.length < 8}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {resettingPassword ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>Reset Password</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend/Activate/Terminate Account Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${suspendModal.action === 'SUSPEND' ? 'bg-orange-500/20' :
                                    suspendModal.action === 'ACTIVATE' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                    }`}>
                                    {suspendModal.action === 'SUSPEND' && <Pause className="h-6 w-6 text-orange-400" />}
                                    {suspendModal.action === 'ACTIVATE' && <Play className="h-6 w-6 text-emerald-400" />}
                                    {suspendModal.action === 'TERMINATE' && <Ban className="h-6 w-6 text-red-400" />}
                                </div>
                                <h3 className="text-lg font-semibold text-white">
                                    {suspendModal.action === 'SUSPEND' && 'Suspend Account'}
                                    {suspendModal.action === 'ACTIVATE' && 'Reactivate Account'}
                                    {suspendModal.action === 'TERMINATE' && 'Terminate Account'}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setSuspendModal(null)
                                    setSuspendReason('')
                                }}
                                className="p-1 hover:bg-stone-700 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>

                        <p className="text-stone-300 mb-4">
                            {suspendModal.action === 'SUSPEND' && (
                                <>Are you sure you want to suspend <span className="font-semibold text-white">{suspendModal.name}</span>? They will be blocked from logging in.</>
                            )}
                            {suspendModal.action === 'ACTIVATE' && (
                                <>Reactivate <span className="font-semibold text-white">{suspendModal.name}</span>? They will be able to login again.</>
                            )}
                            {suspendModal.action === 'TERMINATE' && (
                                <>Permanently terminate <span className="font-semibold text-white">{suspendModal.name}</span>? This is a hard block and should only be used for closed accounts.</>
                            )}
                        </p>

                        {(suspendModal.action === 'SUSPEND' || suspendModal.action === 'TERMINATE') && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Reason (optional)
                                </label>
                                <input
                                    type="text"
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    placeholder={suspendModal.action === 'SUSPEND' ? 'e.g., Payment overdue' : 'e.g., Account closed by owner'}
                                    className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setSuspendModal(null)
                                    setSuspendReason('')
                                }}
                                disabled={suspending}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSuspendAccount}
                                disabled={suspending}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${suspendModal.action === 'SUSPEND' ? 'bg-orange-600 hover:bg-orange-500' :
                                    suspendModal.action === 'ACTIVATE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                                    }`}
                            >
                                {suspending ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {suspendModal.action === 'SUSPEND' && 'Suspend Account'}
                                        {suspendModal.action === 'ACTIVATE' && 'Reactivate Account'}
                                        {suspendModal.action === 'TERMINATE' && 'Terminate Account'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Location Modal */}
            {addLocationModal && (
                <AddLocationModal
                    isOpen={!!addLocationModal}
                    onClose={() => setAddLocationModal(null)}
                    onSuccess={() => {
                        setToast({ message: 'Location added successfully!', type: 'success' })
                        fetchFranchisors()
                    }}
                    franchisorId={addLocationModal.id}
                    franchisorName={addLocationModal.name}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}

