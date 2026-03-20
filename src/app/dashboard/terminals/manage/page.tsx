'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Monitor, Edit, Save, X, Search, Plus, Trash2, Power,
    Link2, CheckCircle, AlertCircle
} from 'lucide-react'

type Terminal = {
    id: string
    name: string
    terminalType: string
    terminalIP: string
    terminalPort: string
    isActive: boolean
    assignedStation: { id: string; name: string } | null
    createdAt: string
    updatedAt: string
}

type Station = {
    id: string
    name: string
    isActive: boolean
}

type LocationGroup = {
    locationId: string
    locationName: string
    franchiseName: string
    legacyIP: string | null
    legacyPort: string | null
    legacyMID: string | null
    terminals: Terminal[]
    stations: Station[]
    updatedAt: string
}

export default function TerminalManagePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') },
    })

    const [locations, setLocations] = useState<LocationGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Add terminal modal
    const [addModal, setAddModal] = useState<{ locationId: string; stations: Station[] } | null>(null)
    const [addForm, setAddForm] = useState({ name: '', terminalIP: '', terminalPort: '10009', stationId: '' })

    // Edit terminal
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ name: '', terminalIP: '', terminalPort: '10009', stationId: '' })

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'PROVIDER') {
            fetchTerminals()
        }
    }, [status, session])

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    async function fetchTerminals() {
        try {
            const res = await fetch('/api/terminals/manage')
            if (res.ok) {
                const data = await res.json()
                setLocations(data)
            }
        } catch (error) {
            console.error('Error fetching terminals:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!addModal || !addForm.name || !addForm.terminalIP) return
        setSaving(true)

        try {
            const res = await fetch('/api/terminals/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: addModal.locationId,
                    name: addForm.name,
                    terminalIP: addForm.terminalIP,
                    terminalPort: addForm.terminalPort || '10009',
                    stationId: addForm.stationId || undefined,
                })
            })

            if (res.ok) {
                setToast({ message: `Terminal "${addForm.name}" created`, type: 'success' })
                setAddModal(null)
                setAddForm({ name: '', terminalIP: '', terminalPort: '10009', stationId: '' })
                await fetchTerminals()
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to create terminal', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to create terminal', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    async function handleUpdate(terminalId: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/terminals/manage/${terminalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    terminalIP: editForm.terminalIP,
                    terminalPort: editForm.terminalPort,
                    stationId: editForm.stationId || null,
                })
            })

            if (res.ok) {
                setToast({ message: 'Terminal updated', type: 'success' })
                setEditingId(null)
                await fetchTerminals()
            } else {
                const data = await res.json()
                setToast({ message: data.error || 'Failed to update', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to update terminal', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(terminalId: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/terminals/manage/${terminalId}`, { method: 'DELETE' })
            if (res.ok) {
                setToast({ message: 'Terminal deleted', type: 'success' })
                setDeleteConfirm(null)
                await fetchTerminals()
            } else {
                setToast({ message: 'Failed to delete terminal', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to delete terminal', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    async function handleToggleActive(terminalId: string, isActive: boolean) {
        try {
            await fetch(`/api/terminals/manage/${terminalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive })
            })
            await fetchTerminals()
        } catch {
            setToast({ message: 'Failed to toggle terminal', type: 'error' })
        }
    }

    function startEdit(terminal: Terminal) {
        setEditingId(terminal.id)
        setEditForm({
            name: terminal.name,
            terminalIP: terminal.terminalIP,
            terminalPort: terminal.terminalPort || '10009',
            stationId: terminal.assignedStation?.id || ''
        })
    }

    const filteredLocations = locations.filter(loc => {
        const q = searchQuery.toLowerCase()
        return (
            loc.locationName.toLowerCase().includes(q) ||
            loc.franchiseName.toLowerCase().includes(q) ||
            loc.terminals.some(t =>
                t.name.toLowerCase().includes(q) ||
                t.terminalIP.includes(q)
            )
        )
    })

    const totalTerminals = locations.reduce((sum, loc) => sum + loc.terminals.length, 0)

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
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
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">PAX Terminal Management</h1>
                <p className="text-stone-400">
                    {totalTerminals} terminal{totalTerminals !== 1 ? 's' : ''} across {locations.length} location{locations.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by location, franchise, terminal name, or IP..."
                        className="w-full pl-12 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {filteredLocations.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Monitor className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {searchQuery ? 'No Results' : 'No Locations Found'}
                    </h3>
                    <p className="text-stone-400">
                        {searchQuery
                            ? `No locations or terminals match "${searchQuery}"`
                            : 'Locations will appear once franchisees are created'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredLocations.map(loc => (
                        <div key={loc.locationId} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            {/* Location Header */}
                            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{loc.locationName}</h3>
                                    <p className="text-sm text-stone-400">{loc.franchiseName}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setAddModal({ locationId: loc.locationId, stations: loc.stations })
                                        setAddForm({ name: '', terminalIP: '', terminalPort: '10009', stationId: '' })
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Terminal
                                </button>
                            </div>

                            {/* Terminals List */}
                            {loc.terminals.length === 0 ? (
                                <div className="p-6 text-center">
                                    <Monitor className="h-10 w-10 text-stone-600 mx-auto mb-2" />
                                    <p className="text-stone-500 text-sm">No credit card terminals configured</p>
                                    {loc.legacyIP && (
                                        <p className="text-amber-400 text-xs mt-2">
                                            ⚠️ Legacy config detected: {loc.legacyIP}:{loc.legacyPort}
                                            {loc.legacyMID ? ` (MID: ${loc.legacyMID})` : ''}.
                                            Click "Add Terminal" to migrate.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-800">
                                    {loc.terminals.map(terminal => (
                                        <div key={terminal.id} className="p-5">
                                            {editingId === terminal.id ? (
                                                // Edit Mode
                                                <div className="space-y-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-stone-400 mb-2">Terminal Name*</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.name}
                                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                                placeholder="Counter Left"
                                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-stone-400 mb-2">IP Address*</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.terminalIP}
                                                                onChange={(e) => setEditForm({ ...editForm, terminalIP: e.target.value })}
                                                                placeholder="192.168.1.100"
                                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-stone-400 mb-2">Port</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.terminalPort}
                                                                onChange={(e) => setEditForm({ ...editForm, terminalPort: e.target.value })}
                                                                placeholder="10009"
                                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-stone-400 mb-2">Assign to Station</label>
                                                            <select
                                                                value={editForm.stationId}
                                                                onChange={(e) => setEditForm({ ...editForm, stationId: e.target.value })}
                                                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                            >
                                                                <option value="">None</option>
                                                                {loc.stations.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                                ))}
                                                            </select>
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
                                                            onClick={() => handleUpdate(terminal.id)}
                                                            disabled={saving || !editForm.name || !editForm.terminalIP}
                                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                            {saving ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${terminal.isActive ? 'bg-emerald-500/20' : 'bg-stone-700/50'}`}>
                                                            <Monitor className={`h-5 w-5 ${terminal.isActive ? 'text-emerald-400' : 'text-stone-500'}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-white">{terminal.name}</span>
                                                                {terminal.isActive ? (
                                                                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                                                                        <CheckCircle className="h-3 w-3" /> Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-xs text-stone-500">
                                                                        <AlertCircle className="h-3 w-3" /> Disabled
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-sm text-stone-400 mt-1">
                                                                <span className="font-mono">{terminal.terminalIP}:{terminal.terminalPort}</span>
                                                                {terminal.assignedStation && (
                                                                    <span className="flex items-center gap-1 text-purple-400 text-xs">
                                                                        <Link2 className="h-3 w-3" />
                                                                        {terminal.assignedStation.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleActive(terminal.id, terminal.isActive)}
                                                            className={`p-2 rounded-lg transition-colors ${terminal.isActive ? 'hover:bg-amber-500/20 text-stone-400 hover:text-amber-400' : 'hover:bg-emerald-500/20 text-stone-400 hover:text-emerald-400'}`}
                                                            title={terminal.isActive ? 'Disable' : 'Enable'}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => startEdit(terminal)}
                                                            className="p-2 rounded-lg hover:bg-purple-500/20 text-stone-400 hover:text-purple-400 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm({ id: terminal.id, name: terminal.name })}
                                                            className="p-2 rounded-lg hover:bg-red-500/20 text-stone-400 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Terminal Modal */}
            {addModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Plus className="h-5 w-5 text-purple-400" />
                            Add Credit Card Terminal
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Terminal Name *</label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g. Counter Left, Register 2"
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">PAX IP Address *</label>
                                    <input
                                        type="text"
                                        value={addForm.terminalIP}
                                        onChange={(e) => setAddForm({ ...addForm, terminalIP: e.target.value })}
                                        placeholder="192.168.1.100"
                                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Port</label>
                                    <input
                                        type="text"
                                        value={addForm.terminalPort}
                                        onChange={(e) => setAddForm({ ...addForm, terminalPort: e.target.value })}
                                        placeholder="10009"
                                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            {addModal.stations.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Assign to POS Station (optional)</label>
                                    <select
                                        value={addForm.stationId}
                                        onChange={(e) => setAddForm({ ...addForm, stationId: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="">Not assigned</option>
                                        {addModal.stations.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setAddModal(null)}
                                className="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={saving || !addForm.name || !addForm.terminalIP}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? 'Creating...' : 'Create Terminal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-2">Delete Terminal</h3>
                        <p className="text-stone-400 text-sm mb-6">
                            Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm.name}</span>? This will unlink it from any assigned station.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}
