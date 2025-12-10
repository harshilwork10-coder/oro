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
    Key,
    Monitor,
    Edit,
    Save,
    X
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import TransferTerminalModal from '@/components/modals/TransferTerminalModal'
import AddTerminalModal from '@/components/modals/AddTerminalModal'
import { formatDistanceToNow } from 'date-fns'

export default function TerminalsPage() {
    const { data: session } = useSession()
    const [licenses, setLicenses] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'licenses' | 'requests' | 'pax'>('licenses')
    const [approving, setApproving] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])

    // PAX Configuration State
    type PaxTerminal = {
        id: string
        locationId: string
        location: { id: string; name: string; franchise: { name: string } }
        paxTerminalIP: string | null
        paxTerminalPort: string
        processorMID: string | null
    }
    const [paxTerminals, setPaxTerminals] = useState<PaxTerminal[]>([])
    const [paxLoading, setPaxLoading] = useState(false)
    const [paxEditingId, setPaxEditingId] = useState<string | null>(null)
    const [paxSaving, setPaxSaving] = useState(false)
    const [paxEditForm, setPaxEditForm] = useState({ paxTerminalIP: '', paxTerminalPort: '10009', processorMID: '' })

    // Modal state
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedTerminal, setSelectedTerminal] = useState<any>(null)

    // Only Franchisors/Providers can add new terminals (provisioning)
    const canManageTerminals = session?.user?.role === 'FRANCHISOR' || session?.user?.role === 'PROVIDER'

    useEffect(() => {
        fetchLicenses()
        if (canManageTerminals) {
            fetchLocations()
        }
        if (session?.user?.role === 'PROVIDER') {
            fetchRequests()
            fetchPaxTerminals()
        }
    }, [session])

    // PAX Terminal Functions
    const fetchPaxTerminals = async () => {
        setPaxLoading(true)
        try {
            const res = await fetch('/api/terminals/manage')
            if (res.ok) setPaxTerminals(await res.json())
        } catch (e) { console.error(e) }
        finally { setPaxLoading(false) }
    }

    const startPaxEdit = (terminal: PaxTerminal) => {
        setPaxEditingId(terminal.locationId)
        setPaxEditForm({
            paxTerminalIP: terminal.paxTerminalIP || '',
            paxTerminalPort: terminal.paxTerminalPort || '10009',
            processorMID: terminal.processorMID || ''
        })
    }

    const handlePaxUpdate = async (locationId: string) => {
        setPaxSaving(true)
        try {
            const res = await fetch(`/api/terminals/manage/${locationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paxEditForm)
            })
            if (res.ok) {
                await fetchPaxTerminals()
                setPaxEditingId(null)
                setPaxEditForm({ paxTerminalIP: '', paxTerminalPort: '10009', processorMID: '' })
            } else { alert('Failed to save') }
        } catch (e) { console.error(e); alert('Error') }
        finally { setPaxSaving(false) }
    }

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/franchise/locations') // Assuming this endpoint exists, or I might need to create it
            const data = await res.json()
            if (data.locations) setLocations(data.locations)
        } catch (e) { console.error(e) }
    }

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
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Add Terminal
                        </button>
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
                    <button
                        onClick={() => setActiveTab('pax')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'pax' ? 'text-orange-500' : 'text-stone-400 hover:text-stone-200'}`}
                    >
                        <Monitor className="h-4 w-4 inline mr-1" />
                        PAX Configuration
                        {activeTab === 'pax' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
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
            ) : activeTab === 'requests' ? (
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
            ) : (
                /* PAX Configuration Tab */
                <div className="space-y-4">
                    <p className="text-stone-400 text-sm">Configure PAX terminal connections for all locations ({paxTerminals.length} total)</p>
                    {paxLoading ? (
                        <p className="text-stone-500 text-center py-10">Loading PAX terminals...</p>
                    ) : paxTerminals.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
                            <Monitor className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                            <p className="text-stone-400">No locations found. Locations appear here once franchisees are created.</p>
                        </div>
                    ) : (
                        paxTerminals.map((terminal) => (
                            <div key={terminal.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{terminal.location.name}</h3>
                                        <p className="text-sm text-stone-400">{terminal.location.franchise.name}</p>
                                    </div>
                                    {paxEditingId !== terminal.locationId && (
                                        <button onClick={() => startPaxEdit(terminal)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors">
                                            <Edit className="h-4 w-4" /> Edit
                                        </button>
                                    )}
                                </div>
                                {paxEditingId === terminal.locationId ? (
                                    <div className="space-y-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-stone-400 mb-2">PAX Terminal IP*</label>
                                                <input type="text" value={paxEditForm.paxTerminalIP} onChange={(e) => setPaxEditForm({ ...paxEditForm, paxTerminalIP: e.target.value })} placeholder="192.168.1.100" className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-stone-400 mb-2">Port</label>
                                                <input type="text" value={paxEditForm.paxTerminalPort} onChange={(e) => setPaxEditForm({ ...paxEditForm, paxTerminalPort: e.target.value })} placeholder="10009" className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-stone-400 mb-2">Merchant ID (MID)</label>
                                                <input type="text" value={paxEditForm.processorMID} onChange={(e) => setPaxEditForm({ ...paxEditForm, processorMID: e.target.value })} placeholder="Merchant ID" className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 justify-end">
                                            <button onClick={() => setPaxEditingId(null)} disabled={paxSaving} className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"><X className="h-4 w-4" /> Cancel</button>
                                            <button onClick={() => handlePaxUpdate(terminal.locationId)} disabled={paxSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> {paxSaving ? 'Saving...' : 'Save Changes'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-6">
                                        <div><p className="text-xs text-stone-500 mb-1">IP Address</p><p className="text-white font-mono text-lg">{terminal.paxTerminalIP || <span className="text-stone-600">Not set</span>}</p></div>
                                        <div><p className="text-xs text-stone-500 mb-1">Port</p><p className="text-white font-mono text-lg">{terminal.paxTerminalPort}</p></div>
                                        <div><p className="text-xs text-stone-500 mb-1">Merchant ID</p><p className="text-white font-mono text-lg">{terminal.processorMID || <span className="text-stone-600">—</span>}</p></div>
                                    </div>
                                )}
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

            <AddTerminalModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    fetchLicenses()
                }}
                locations={locations}
            />
        </div>
    )
}
