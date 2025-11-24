'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { Phone, Check, MessageSquare, Clock, Calendar, User, Building2 } from "lucide-react"

type ConsultationRequest = {
    id: string
    reason: string
    details: string
    contactPhone: string
    preferredContactTime: string | null
    status: 'PENDING' | 'CONTACTED' | 'RESOLVED'
    resolution: string | null
    createdAt: string
    franchise: {
        name: string
        users: {
            name: string
            email: string
        }[]
    }
}

const reasonLabels: Record<string, string> = {
    SETUP_HELP: 'Payment Setup Help',
    QUESTIONS: 'General Questions',
    TECHNICAL_ISSUE: 'Technical Issue',
    OTHER: 'Other'
}

export default function ConsultationsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [requests, setRequests] = useState<ConsultationRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONTACTED' | 'RESOLVED'>('ALL')

    async function fetchRequests() {
        try {
            const response = await fetch('/api/provider/consultations')
            if (response.ok) {
                const data = await response.json()
                setRequests(data)
            }
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchRequests()
        }
    }, [status])

    const handleStatusUpdate = async (requestId: string, newStatus: 'CONTACTED' | 'RESOLVED', resolution?: string) => {
        try {
            const response = await fetch('/api/provider/consultations', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestId, status: newStatus, resolution })
            })

            if (response.ok) {
                setRequests(requests.map(req =>
                    req.id === requestId ? { ...req, status: newStatus, resolution: resolution || req.resolution } : req
                ))
            }
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const filteredRequests = filter === 'ALL'
        ? requests
        : requests.filter(r => r.status === filter)

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Consultation Requests</h1>
                    <p className="text-stone-400 mt-2">Manage callback requests from franchisees</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-stone-800">
                {(['ALL', 'PENDING', 'CONTACTED', 'RESOLVED'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 font-medium transition-colors ${filter === tab
                            ? 'text-orange-400 border-b-2 border-orange-500'
                            : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        {tab} ({tab === 'ALL' ? requests.length : requests.filter(r => r.status === tab).length})
                    </button>
                ))}
            </div>

            <div className="grid gap-6">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 glass-panel rounded-xl">
                        <Phone className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-stone-100">No consultation requests</h3>
                        <p className="text-stone-400">Requests from franchisees will appear here.</p>
                    </div>
                ) : (
                    filteredRequests.map((request) => (
                        <div key={request.id} className="glass-panel rounded-xl p-6 hover:border-orange-500/30 transition-all">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border
                                            ${request.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                request.status === 'CONTACTED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                            {request.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                            {request.status === 'CONTACTED' && <Phone className="h-3 w-3" />}
                                            {request.status === 'RESOLVED' && <Check className="h-3 w-3" />}
                                            {request.status}
                                        </span>
                                        <span className="text-sm text-stone-500">
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-stone-100 mb-2">
                                        <Building2 className="h-4 w-4 text-stone-500" />
                                        <span className="font-bold">{request.franchise.name}</span>
                                        <span className="text-stone-600">•</span>
                                        <User className="h-4 w-4 text-stone-500" />
                                        <span>{request.franchise.users[0]?.name}</span>
                                    </div>

                                    <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30 mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquare className="h-4 w-4 text-purple-400" />
                                            <span className="text-sm font-semibold text-purple-200">
                                                {reasonLabels[request.reason] || request.reason}
                                            </span>
                                        </div>
                                        <p className="text-sm text-stone-300">{request.details}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-stone-500" />
                                            <span className="font-medium text-stone-100">{request.contactPhone}</span>
                                        </div>
                                        {request.preferredContactTime && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-stone-500" />
                                                <span className="text-stone-400">{request.preferredContactTime}</span>
                                            </div>
                                        )}
                                    </div>

                                    {request.resolution && (
                                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                            <p className="text-sm font-medium text-emerald-300">Resolution:</p>
                                            <p className="text-sm text-stone-300">{request.resolution}</p>
                                        </div>
                                    )}
                                </div>

                                {request.status !== 'RESOLVED' && (
                                    <div className="flex flex-row lg:flex-col gap-3 pt-4 lg:pt-0 lg:border-l lg:border-stone-800 lg:pl-6">
                                        {request.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStatusUpdate(request.id, 'CONTACTED')}
                                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Mark Called
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                const resolution = prompt('Enter resolution notes:')
                                                if (resolution) handleStatusUpdate(request.id, 'RESOLVED', resolution)
                                            }}
                                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <Check className="h-4 w-4" />
                                            Resolve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
