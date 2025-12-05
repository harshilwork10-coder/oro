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
                                <a href={client.voidCheckUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
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
                                <a href={client.driverLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
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
                                <a href={client.feinLetterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View Document
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Locations List */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Locations ({client._count.franchises})</h2>
                <div className="space-y-4">
                    {client.franchises.map((location) => (
                        <div key={location.id} className="p-4 bg-stone-800/30 rounded-xl border border-stone-700 hover:border-purple-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100">{location.name}</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-stone-400">
                                    <Users className="h-4 w-4" />
                                    <span>{location._count.users} users</span>
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
