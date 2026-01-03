'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Monitor, Edit, Save, X, Search } from 'lucide-react'

type Terminal = {
    id: string
    locationId: string
    location: {
        id: string
        name: string
        franchise: {
            name: string
        }
    }
    paxTerminalIP: string | null
    paxTerminalPort: string
    processorMID: string | null
    updatedAt: string
}

export default function TerminalManagePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [terminals, setTerminals] = useState<Terminal[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [editForm, setEditForm] = useState({
        paxTerminalIP: '',
        paxTerminalPort: '10009',
        processorMID: ''
    })
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'PROVIDER') {
            fetchTerminals()
        }
    }, [status, session])

    async function fetchTerminals() {
        try {
            const res = await fetch('/api/terminals/manage')
            if (res.ok) {
                const data = await res.json()
                setTerminals(data)
            }
        } catch (error) {
            console.error('Error fetching terminals:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdate(locationId: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/terminals/manage/${locationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                await fetchTerminals()
                setEditingId(null) // Auto-close after successful save
                setEditForm({
                    paxTerminalIP: '',
                    paxTerminalPort: '10009',
                    processorMID: ''
                })
            } else {
                setToast({ message: 'Failed to update terminal configuration', type: 'error' })
            }
        } catch (error) {
            console.error('Error updating terminal:', error)
            setToast({ message: 'Error updating terminal configuration', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    function startEdit(terminal: Terminal) {
        setEditingId(terminal.locationId)
        setEditForm({
            paxTerminalIP: terminal.paxTerminalIP || '',
            paxTerminalPort: terminal.paxTerminalPort || '10009',
            processorMID: terminal.processorMID || ''
        })
    }

    // Filter terminals by search query
    const filteredTerminals = terminals.filter(terminal => {
        const query = searchQuery.toLowerCase()
        return (
            terminal.location.name.toLowerCase().includes(query) ||
            terminal.location.franchise.name.toLowerCase().includes(query) ||
            (terminal.paxTerminalIP && terminal.paxTerminalIP.includes(query)) ||
            (terminal.processorMID && terminal.processorMID.toLowerCase().includes(query))
        )
    })

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    if (session?.user?.role !== 'PROVIDER') {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <p className="text-red-400">Access Denied: Provider role required</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">PAX Terminal Management</h1>
                <p className="text-stone-400">
                    Configure PAX terminal connections for all locations ({terminals.length} total)
                </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by location name, franchise, IP, or MID..."
                        className="w-full pl-12 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-sm text-stone-500 mt-2">
                        Showing {filteredTerminals.length} of {terminals.length} locations
                    </p>
                )}
            </div>

            {terminals.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Monitor className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Locations Found</h3>
                    <p className="text-stone-400">Locations will appear here once franchisees are created</p>
                </div>
            ) : filteredTerminals.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Search className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Results</h3>
                    <p className="text-stone-400">No locations match "{searchQuery}"</p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                        Clear Search
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTerminals.map((terminal) => (
                        <div key={terminal.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{terminal.location.name}</h3>
                                    <p className="text-sm text-stone-400">{terminal.location.franchise.name}</p>
                                </div>
                                {editingId !== terminal.locationId && (
                                    <button
                                        onClick={() => startEdit(terminal)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Edit
                                    </button>
                                )}
                            </div>

                            {editingId === terminal.locationId ? (
                                <div className="space-y-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-2">
                                                PAX Terminal IP*
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.paxTerminalIP}
                                                onChange={(e) => setEditForm({ ...editForm, paxTerminalIP: e.target.value })}
                                                placeholder="192.168.1.100"
                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-2">
                                                Port
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.paxTerminalPort}
                                                onChange={(e) => setEditForm({ ...editForm, paxTerminalPort: e.target.value })}
                                                placeholder="10009"
                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-2">
                                                Merchant ID (MID)
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.processorMID}
                                                onChange={(e) => setEditForm({ ...editForm, processorMID: e.target.value })}
                                                placeholder="Merchant ID"
                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            disabled={saving}
                                            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(terminal.locationId)}
                                            disabled={saving}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">IP Address</p>
                                        <p className="text-white font-mono text-lg">
                                            {terminal.paxTerminalIP || <span className="text-stone-600">Not set</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Port</p>
                                        <p className="text-white font-mono text-lg">{terminal.paxTerminalPort}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Merchant ID</p>
                                        <p className="text-white font-mono text-lg">
                                            {terminal.processorMID || <span className="text-stone-600">—</span>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

