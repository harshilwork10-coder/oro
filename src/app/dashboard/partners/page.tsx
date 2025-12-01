'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { MapPin, Plus, Users, DollarSign, Building2 } from "lucide-react"

type Location = {
    id: string
    name: string
    slug: string
    createdAt: string
    locations: Array<{
        id: string
        name: string
        address: string | null
    }>
    _count: {
        users: number
        transactions: number
    }
}

export default function ClientLocationsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newLocation, setNewLocation] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: ''
    })
    const [submitting, setSubmitting] = useState(false)

    async function fetchLocations() {
        try {
            const response = await fetch('/api/client/locations')
            if (response.ok) {
                const data = await response.json()
                setLocations(data)
            }
        } catch (error) {
            console.error('Error fetching locations:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAddLocation() {
        if (!newLocation.name || !newLocation.address) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/client/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation)
            })

            if (res.ok) {
                setShowAddModal(false)
                setNewLocation({ name: '', address: '', city: '', state: '', zip: '', phone: '' })
                fetchLocations()
            }
        } catch (error) {
            console.error('Error adding location:', error)
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchLocations()
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Partners</h1>
                    <p className="text-stone-400 mt-2">Manage your business locations</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 hover:scale-105 transition-all font-medium">
                    <Plus className="h-5 w-5" />
                    Add Location
                </button>
            </div>

            {/* Locations Grid */}
            {locations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locations.map((franchise) => (
                        franchise.locations.map((location) => (
                            <div key={location.id} className="glass-panel p-6 rounded-2xl hover:border-purple-500/30 transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                        <MapPin className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
                                        Active
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-stone-100 mb-1 relative z-10">{location.name}</h3>
                                <p className="text-sm text-stone-400 mb-6 relative z-10">{location.address || 'No address set'}</p>

                                <div className="space-y-3 pt-4 border-t border-stone-800 relative z-10">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-stone-500 flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Employees
                                        </span>
                                        <span className="font-bold text-stone-200">{franchise._count.users}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-stone-500 flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Transactions
                                        </span>
                                        <span className="font-bold text-stone-200">{franchise._count.transactions}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ))}
                </div>
            ) : (
                <div className="glass-panel p-12 rounded-2xl text-center">
                    <Building2 className="h-16 w-16 text-stone-700 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-stone-100 mb-2">No locations yet</h2>
                    <p className="text-stone-400 mb-6">Add your first business location to get started</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:scale-105 transition-all">
                        Add Your First Location
                    </button>
                </div>
            )}

            {/* Add Location Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-stone-100 mb-6">Add New Location</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Location Name *</label>
                                <input
                                    type="text"
                                    value={newLocation.name}
                                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                    placeholder="Downtown Store"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Street Address *</label>
                                <input
                                    type="text"
                                    value={newLocation.address}
                                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                    placeholder="123 Main St"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">City</label>
                                    <input
                                        type="text"
                                        value={newLocation.city}
                                        onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                        placeholder="New York"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">State</label>
                                    <input
                                        type="text"
                                        value={newLocation.state}
                                        onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                        placeholder="NY"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={newLocation.zip}
                                        onChange={(e) => setNewLocation({ ...newLocation, zip: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                        placeholder="10001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={newLocation.phone}
                                        onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowAddModal(false)
                                    setNewLocation({ name: '', address: '', city: '', state: '', zip: '', phone: '' })
                                }}
                                className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLocation}
                                disabled={!newLocation.name || !newLocation.address || submitting}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-900/40">
                                {submitting ? 'Adding...' : 'Add Location'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
