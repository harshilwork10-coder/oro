'use client'

import { useSession } from "next-auth/react"
import { redirect, useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeft, Building2, Mail, Calendar, MapPin, Users, DollarSign, TrendingUp, Edit, FileText, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react"
import EditClientModal from "@/components/modals/EditClientModal"

type ClientDetails = {
    id: string
    name: string
    approvalStatus?: string
    businessType?: string
    address?: string
    phone?: string
    // Documents
    voidCheckUrl?: string
    driverLicenseUrl?: string
    feinLetterUrl?: string
    needToDiscussProcessing?: boolean
    owner: {
        name: string
        email: string
    }
    franchises: Array<{
        id: string
        name: string
        _count: {
            users: number
        }
    }>
    _count: {
        franchises: number
    }
    createdAt: string
}

export default function ClientDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [client, setClient] = useState<ClientDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    async function fetchClientDetails() {
        try {
            const res = await fetch(`/api/admin/clients/${params.id}`)
            if (res.ok) {
                const data = await res.json()
                setClient(data)
            }
        } catch (error) {
            console.error('Error fetching client details:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchClientDetails()
        }
    }, [status, params.id])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    if (!client) {
        return (
            <div className="p-8 text-center">
                <p className="text-stone-400">Client not found</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-stone-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-stone-100">{client.name}</h1>
                        <p className="text-stone-400 mt-1">Client Details</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Edit className="h-5 w-5" />
                    Edit Client
                </button>
            </div>

            {isEditModalOpen && (
                <EditClientModal
                    client={client}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        fetchClientDetails()
                        setIsEditModalOpen(false)
                    }}
                />
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <Building2 className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">{client._count.franchises}</p>
                    <p className="text-sm text-stone-400 mt-1">Total Locations</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">
                        {client.franchises.reduce((sum, f) => sum + f._count.users, 0)}
                    </p>
                    <p className="text-sm text-stone-400 mt-1">Total Users</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="h-8 w-8 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">$0</p>
                    <p className="text-sm text-stone-400 mt-1">Total Revenue</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="h-8 w-8 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">+0%</p>
                    <p className="text-sm text-stone-400 mt-1">Growth Rate</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Client Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-stone-500 mb-1">Owner Name</p>
                            <p className="text-stone-200">{client.owner.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-stone-500 mb-1">Email</p>
                            <p className="text-stone-200">{client.owner.email}</p>
                        </div>
                        {client.address && (
                            <div>
                                <p className="text-sm text-stone-500 mb-1">Address</p>
                                <p className="text-stone-200">{client.address}</p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-stone-500 mb-1">Client Since</p>
                            <p className="text-stone-200">{new Date(client.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <p className="text-sm text-stone-500 mb-1">Approval Status</p>
                            {(!client.approvalStatus || client.approvalStatus === 'PENDING') && (
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium border border-amber-500/20 inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Pending Approval
                                </span>
                            )}
                            {client.approvalStatus === 'APPROVED' && (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20 inline-flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Approved
                                </span>
                            )}
                            {client.approvalStatus === 'REJECTED' && (
                                <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20 inline-flex items-center gap-1">
                                    <XCircle className="h-3 w-3" /> Rejected
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-400" />
                    Uploaded Documents
                </h2>
                {client.needToDiscussProcessing ? (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-sm">
                        Client requested to discuss processing rates - documents may not be uploaded yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-xl border ${client.voidCheckUrl ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-stone-800/30 border-stone-700'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {client.voidCheckUrl ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <Clock className="h-5 w-5 text-stone-500" />
                                )}
                                <span className={client.voidCheckUrl ? 'text-emerald-400 font-medium' : 'text-stone-400'}>Voided Check</span>
                            </div>
                            {client.voidCheckUrl && (
                                <a href={`/api/documents/view?key=${encodeURIComponent(client.voidCheckUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View Document
                                </a>
                            )}
                        </div>
                        <div className={`p-4 rounded-xl border ${client.driverLicenseUrl ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-stone-800/30 border-stone-700'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {client.driverLicenseUrl ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <Clock className="h-5 w-5 text-stone-500" />
                                )}
                                <span className={client.driverLicenseUrl ? 'text-emerald-400 font-medium' : 'text-stone-400'}>Driver's License</span>
                            </div>
                            {client.driverLicenseUrl && (
                                <a href={`/api/documents/view?key=${encodeURIComponent(client.driverLicenseUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View Document
                                </a>
                            )}
                        </div>
                        <div className={`p-4 rounded-xl border ${client.feinLetterUrl ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-stone-800/30 border-stone-700'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {client.feinLetterUrl ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <Clock className="h-5 w-5 text-stone-500" />
                                )}
                                <span className={client.feinLetterUrl ? 'text-emerald-400 font-medium' : 'text-stone-400'}>FEIN Letter</span>
                            </div>
                            {client.feinLetterUrl && (
                                <a href={`/api/documents/view?key=${encodeURIComponent(client.feinLetterUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View Document
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Oronex Pulse Section */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6 flex items-center gap-2">
                    <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Oronex Pulse
                </h2>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-violet-300 text-sm mb-3">
                        Oronex Pulse gives owners real-time mobile access to sales, inventory, and employee data.
                    </p>
                    <a
                        href="/dashboard/account-configs"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Users className="h-4 w-4" />
                        Manage Pulse Users & Seats
                        <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                </div>
            </div>

            {/* Locations List */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Stores ({client._count.franchises})</h2>
                <div className="space-y-4">
                    {client.franchises.map((location) => (
                        <div key={location.id} className="p-4 bg-stone-800/30 rounded-xl border border-stone-700 hover:border-purple-500/30 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100">{location.name}</h3>
                                        <span className="text-xs text-stone-500">ID: {location.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-stone-400">
                                    <Users className="h-4 w-4" />
                                    <span>{location._count.users} users</span>
                                </div>
                            </div>

                            {/* Store Actions - Organized by Category */}
                            <div className="space-y-3 pt-3 border-t border-stone-700/50">

                                {/* Setup & Onboarding */}
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Setup & Onboarding</p>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`/dashboard/inventory/import?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Import Inventory
                                        </a>
                                        <a
                                            href={`/dashboard/deals/manufacturer?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Manufacturer Deals
                                        </a>
                                        <a
                                            href={`/dashboard/settings/stations?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            POS Stations
                                        </a>
                                        <a
                                            href={`/dashboard/terminals?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                            Terminals
                                        </a>
                                    </div>
                                </div>

                                {/* Daily Operations */}
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Daily Operations</p>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`/dashboard/inventory/retail?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            Inventory
                                        </a>
                                        <a
                                            href={`/dashboard/employees?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-sm transition-colors"
                                        >
                                            <Users className="h-4 w-4" />
                                            Employees
                                        </a>
                                        <a
                                            href={`/dashboard/reports?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Reports
                                        </a>
                                        <a
                                            href={`/dashboard/transactions?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-stone-600/30 hover:bg-stone-600/50 border border-stone-600 text-stone-300 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Transactions
                                        </a>
                                    </div>
                                </div>

                                {/* Configuration & Features */}
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Configuration</p>
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`/dashboard/account-configs?clientId=${params.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                            Feature Toggles
                                        </a>
                                        <a
                                            href={`/dashboard/settings/sms-marketing?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            SMS Marketing
                                        </a>
                                        <a
                                            href={`/dashboard/settings/business?franchiseId=${location.id}`}
                                            className="flex items-center gap-2 px-3 py-2 bg-stone-600/30 hover:bg-stone-600/50 border border-stone-600 text-stone-300 rounded-lg text-sm transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Business Settings
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {client.franchises.length === 0 && (
                        <p className="text-center text-stone-400 py-8">No locations yet</p>
                    )}
                </div>
            </div>
        </div>
    )
}
