'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Monitor, Plus, Edit, Trash2, Save, X, History } from 'lucide-react'

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
    processorName: string | null
    processorMID: string | null
    processorTID: string | null
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
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({
        paxTerminalIP: '',
        paxTerminalPort: '10009',
        processorName: '',
        processorMID: '',
        processorTID: ''
    })

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
        try {
            const res = await fetch(`/api/terminals/manage/${locationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                fetchTerminals()
                setEditingId(null)
                setEditForm({
                    paxTerminalIP: '',
                    paxTerminalPort: '10009',
                    processorName: '',
                    processorMID: '',
                    processorTID: ''
                })
            } else {
                alert('Failed to update terminal configuration')
            }
        } catch (error) {
            console.error('Error updating terminal:', error)
            alert('Error updating terminal configuration')
        }
    }

    function startEdit(terminal: Terminal) {
        setEditingId(terminal.locationId)
        setEditForm({
            paxTerminalIP: terminal.paxTerminalIP || '',
            paxTerminalPort: terminal.paxTerminalPort || '10009',
            processorName: terminal.processorName || '',
            processorMID: terminal.processorMID || '',
            processorTID: terminal.processorTID || ''
        })
    }

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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">PAX Terminal Management</h1>
                <p className="text-stone-400">
                    Centrally manage PAX terminal IP addresses and processor configurations for all locations
                </p>
            </div>

            {terminals.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Monitor className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Locations Found</h3>
                    <p className="text-stone-400">Locations will appear here once franchisees are created</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {terminals.map((terminal) => (
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
                                        Edit Configuration
                                    </button>
                                )}
                            </div>

                            {editingId === terminal.locationId ? (
                                <div className="space-y-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-2">
                                                PAX Terminal IP Address*
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
                                                PAX Terminal Port
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
                                                Processor Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.processorName}
                                                onChange={(e) => setEditForm({ ...editForm, processorName: e.target.value })}
                                                placeholder="DATAWIRE, TSYS, etc."
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
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-2">
                                                Terminal ID (TID)
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.processorTID}
                                                onChange={(e) => setEditForm({ ...editForm, processorTID: e.target.value })}
                                                placeholder="Terminal ID"
                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleUpdate(terminal.locationId)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">PAX Terminal IP</p>
                                        <p className="text-white font-mono">
                                            {terminal.paxTerminalIP || <span className="text-stone-600">Not configured</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Port</p>
                                        <p className="text-white font-mono">{terminal.paxTerminalPort}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Processor</p>
                                        <p className="text-white">
                                            {terminal.processorName || <span className="text-stone-600">Not configured</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Merchant ID</p>
                                        <p className="text-white font-mono">
                                            {terminal.processorMID || <span className="text-stone-600">—</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Terminal ID</p>
                                        <p className="text-white font-mono">
                                            {terminal.processorTID || <span className="text-stone-600">—</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 mb-1">Last Updated</p>
                                        <p className="text-stone-400 text-sm">
                                            {new Date(terminal.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
