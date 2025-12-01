'use client'

import { useState, useEffect } from 'react'
import {
    CreditCard,
    Wifi,
    WifiOff,
    RefreshCw,
    Plus,
    Settings,
    Activity,
    Smartphone,
    ArrowRightLeft,
    Search,
    Key
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import TransferTerminalModal from '@/components/modals/TransferTerminalModal'
import { formatDistanceToNow } from 'date-fns'

export default function TerminalsPage() {
    const { data: session } = useSession()
    const [licenses, setLicenses] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'licenses' | 'requests'>('licenses')
    const [approving, setApproving] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [selectedTerminal, setSelectedTerminal] = useState<any>(null)

    // Only Franchisors/Providers can add new terminals (provisioning)
    const canManageTerminals = session?.user?.role === 'FRANCHISOR' || session?.user?.role === 'PROVIDER'

    useEffect(() => {
        fetchLicenses()
        if (session?.user?.role === 'PROVIDER') {
            fetchRequests()
        }
    }, [session])

    const fetchLicenses = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/terminals')
            const data = await res.json()
            if (data.licenses) {
                setLicenses(data.licenses)
            }
        } catch (error) {
            console.error('Failed to fetch licenses:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/requests')
            const data = await res.json()
            if (data.requests) {
                setRequests(data.requests)
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error)
        }
    }

    const handleApprove = async (requestId: string) => {
        setApproving(requestId)
        try {
            const res = await fetch(`/api/admin/requests/${requestId}/approve`, {
                method: 'POST'
            })
            if (res.ok) {
                fetchRequests()
                fetchLicenses() // Refresh licenses too
            }
        } catch (error) {
            console.error('Failed to approve:', error)
        } finally {
            setApproving(null)
        }
    }

    const filteredLicenses = licenses.filter(l =>
        l.licenseKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.terminals && l.terminals.some((t: any) => t.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())))
    )

    const activeCount = licenses.filter(l => l.status === 'ACTIVE').length
    const pendingCount = licenses.filter(l => l.status === 'PENDING').length

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Key className="h-8 w-8 text-orange-500" />
                        Terminals & Licenses
                    </h1>
                    <p className="text-stone-400 mt-2">Manage software licenses and hardware terminals</p>
                </div>
                {canManageTerminals && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => { fetchLicenses(); fetchRequests(); }}
                            className="p-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-400 hover:text-white"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            {session?.user?.role === 'PROVIDER' && (
                <div className="flex gap-4 border-b border-stone-800">
                    <button
                        onClick={() => setActiveTab('licenses')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'licenses' ? 'text-orange-500' : 'text-stone-400 hover:text-stone-200'}`}
                    >
                        Active Licenses
                        {activeTab === 'licenses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'requests' ? 'text-orange-500' : 'text-stone-400 hover:text-stone-200'}`}
                    >
                        Pending Requests
                        {requests.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                                {requests.length}
                            </span>
                        )}
                        {activeTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
                    </button>
                </div>
            )}

            {activeTab === 'licenses' ? (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                            <p className="text-sm text-stone-500 mb-1">Active Licenses</p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-stone-100">{activeCount}</span>
                                <div className="flex items-center text-xs font-medium text-emerald-400">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Running
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border-l-4 border-stone-500">
                            <p className="text-sm text-stone-500 mb-1">Pending Activation</p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-stone-100">{pendingCount}</span>
                                <div className="flex items-center text-xs font-medium text-stone-400">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Setup
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search license key, location, serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* License Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            <p className="text-stone-500 col-span-full text-center py-10">Loading licenses...</p>
                        ) : filteredLicenses.length === 0 ? (
                            <p className="text-stone-500 col-span-full text-center py-10">No licenses found</p>
                        ) : (
                            filteredLicenses.map((license) => (
                                <div key={license.id} className="glass-panel rounded-xl overflow-hidden group hover:border-orange-500/30 transition-all">
                                    {/* Card Header */}
                                    <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${license.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-stone-500/10 text-stone-400'}`}>
                                                <Key className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-stone-200 font-mono text-sm">{license.licenseKey}</h3>
                                                <p className="text-xs text-stone-500">
                                                    {license.location?.name || 'Unassigned Location'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${license.status === 'ACTIVE'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-stone-500/10 text-stone-400 border-stone-500/20'
                                            }`}>
                                            {license.status}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="col-span-2">
                                                <p className="text-stone-500 text-xs mb-1">Attached Terminal</p>
                                                {license.terminals && license.terminals.length > 0 ? (
                                                    license.terminals.map((term: any) => (
                                                        <div key={term.id} className="flex items-center justify-between bg-stone-900/50 p-2 rounded-lg border border-stone-800">
                                                            <div className="flex items-center gap-2">
                                                                <Smartphone className="h-4 w-4 text-stone-400" />
                                                                <div>
                                                                    <p className="text-stone-300 text-xs font-medium">{term.model}</p>
                                                                    <p className="text-stone-500 text-[10px] font-mono">{term.serialNumber}</p>
                                                                </div>
                                                            </div>
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex items-center gap-2 text-stone-500 text-xs italic p-2">
                                                        <WifiOff className="h-3 w-3" />
                                                        No hardware connected
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-stone-500 text-xs">Issued</p>
                                                <p className="text-stone-300 text-xs">
                                                    {formatDistanceToNow(new Date(license.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Actions */}
                                    {canManageTerminals && (
                                        <div className="p-3 bg-stone-900/50 border-t border-stone-800 flex items-center justify-between">
                                            <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors">
                                                <Settings className="h-4 w-4" />
                                                Manage
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                /* Requests Tab */
                <div className="grid grid-cols-1 gap-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-stone-400">No pending requests</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="glass-panel p-6 rounded-xl flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-100">{req.franchisor.name}</h3>
                                    <p className="text-stone-400 text-sm">
                                        Requesting <span className="text-white font-bold">{req.numberOfStations} Stations</span> for <span className="text-white">{req.location.name}</span>
                                    </p>
                                    <p className="text-xs text-stone-500 mt-1">
                                        Owner: {req.franchisor.owner.name} ({req.franchisor.owner.email})
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleApprove(req.id)}
                                    disabled={approving === req.id}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {approving === req.id ? 'Approving...' : 'Approve & Send Contract'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <TransferTerminalModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                terminal={selectedTerminal}
                onSuccess={() => {
                    fetchLicenses()
                }}
            />
        </div>
    )
}
