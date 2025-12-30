'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Clock, Phone, Bell, Check, X, User, AlertCircle, RefreshCw } from 'lucide-react'

interface WaitlistEntry {
    id: string
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    partySize: number
    serviceId: string | null
    service?: { name: string }
    notes: string | null
    status: string
    position: number
    estimatedWait: number | null
    checkedInAt: string
    seatedAt: string | null
    notifiedAt: string | null
}

interface Service {
    id: string
    name: string
    duration: number
}

export default function WaitlistPage() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [form, setForm] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        partySize: 1,
        serviceId: '',
        notes: ''
    })

    useEffect(() => {
        fetchWaitlist()
        fetchServices()
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchWaitlist, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchWaitlist = async () => {
        try {
            const res = await fetch('/api/waitlist')
            if (res.ok) {
                const data = await res.json()
                setEntries(data)
            }
        } catch (error) {
            console.error('Failed to fetch waitlist:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/franchise/services')
            if (res.ok) {
                const data = await res.json()
                setServices(data || [])
            }
        } catch (error) {
            console.error('Failed to fetch services:', error)
        }
    }

    const addToWaitlist = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                setShowAddModal(false)
                setForm({ customerName: '', customerPhone: '', customerEmail: '', partySize: 1, serviceId: '', notes: '' })
                fetchWaitlist()
            }
        } catch (error) {
            console.error('Failed to add to waitlist:', error)
        }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/waitlist/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (res.ok) {
                fetchWaitlist()
            }
        } catch (error) {
            console.error('Failed to update status:', error)
        }
    }

    const removeFromWaitlist = async (id: string) => {
        if (!confirm('Remove this person from the waitlist?')) return
        try {
            const res = await fetch(`/api/waitlist/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchWaitlist()
            }
        } catch (error) {
            console.error('Failed to remove from waitlist:', error)
        }
    }

    const getWaitTime = (checkedInAt: string) => {
        const minutes = Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60000)
        if (minutes < 60) return `${minutes}m`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'WAITING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'NOTIFIED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'SEATED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'NO_SHOW': return 'bg-red-500/20 text-red-400 border-red-500/30'
            case 'CANCELLED': return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
            default: return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
        }
    }

    const waitingEntries = entries.filter(e => e.status === 'WAITING' || e.status === 'NOTIFIED')
    const seatedEntries = entries.filter(e => e.status === 'SEATED')

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="text-orange-500 text-xl">Loading...</div>
            </div>
        )
    }

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="h-8 w-8 text-orange-500" />
                        Walk-in Waitlist
                    </h1>
                    <p className="text-stone-400 mt-2">Manage walk-in customers and queue</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchWaitlist}
                        className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-2"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Walk-in
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Currently Waiting</div>
                        <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-amber-400">{waitingEntries.length}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Seated Today</div>
                        <Check className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{seatedEntries.length}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Avg. Wait Time</div>
                        <Clock className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-blue-400">
                        {waitingEntries.length > 0
                            ? `${Math.round(waitingEntries.reduce((sum, e) => sum + (Date.now() - new Date(e.checkedInAt).getTime()) / 60000, 0) / waitingEntries.length)}m`
                            : '0m'
                        }
                    </div>
                </div>
            </div>

            {/* Waitlist */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 bg-stone-900/50 border-b border-stone-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Queue ({waitingEntries.length})</h2>
                </div>

                {waitingEntries.length === 0 ? (
                    <div className="p-12 text-center text-stone-500">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No one in the waitlist</p>
                        <p className="text-sm mt-1">Click "Add Walk-in" to add customers</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-800">
                        {waitingEntries.map((entry, index) => (
                            <div key={entry.id} className="p-4 hover:bg-stone-900/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    {/* Position */}
                                    <div className="h-12 w-12 bg-orange-600/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xl">
                                        {index + 1}
                                    </div>

                                    {/* Customer Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white truncate">{entry.customerName}</p>
                                            {entry.partySize > 1 && (
                                                <span className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded">
                                                    Party of {entry.partySize}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-stone-400 mt-1">
                                            {entry.customerPhone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {entry.customerPhone}
                                                </span>
                                            )}
                                            {entry.service && (
                                                <span>{entry.service.name}</span>
                                            )}
                                        </div>
                                        {entry.notes && (
                                            <p className="text-xs text-stone-500 mt-1">{entry.notes}</p>
                                        )}
                                    </div>

                                    {/* Wait Time */}
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-white">{getWaitTime(entry.checkedInAt)}</div>
                                        <div className="text-xs text-stone-500">waiting</div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(entry.status)}`}>
                                        {entry.status}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {entry.status === 'WAITING' && (
                                            <button
                                                onClick={() => updateStatus(entry.id, 'NOTIFIED')}
                                                className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg"
                                                title="Notify customer"
                                            >
                                                <Bell className="h-5 w-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => updateStatus(entry.id, 'SEATED')}
                                            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg"
                                            title="Mark as seated"
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => updateStatus(entry.id, 'NO_SHOW')}
                                            className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg"
                                            title="Mark as no-show"
                                        >
                                            <AlertCircle className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => removeFromWaitlist(entry.id)}
                                            className="p-2 bg-stone-700/50 hover:bg-stone-700 text-stone-400 rounded-lg"
                                            title="Remove"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-lg bg-stone-900 rounded-2xl border border-stone-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Add Walk-in</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={addToWaitlist} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.customerName}
                                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={form.customerPhone}
                                        onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Party Size</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.partySize}
                                        onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Service (Optional)</label>
                                <select
                                    value={form.serviceId}
                                    onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                >
                                    <option value="">Select a service</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                    rows={2}
                                    placeholder="Any special requests..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold"
                                >
                                    Add to Waitlist
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

