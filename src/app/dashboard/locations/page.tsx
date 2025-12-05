'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Plus, Search, Edit2, Trash2, MapPin, Building2, Monitor } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'
import RequestStationsModal from '@/components/modals/RequestStationsModal'

interface Location {
    id: string
    name: string
    address: string
    franchiseId: string | null
    franchise: {
        id: string
        name: string
    } | null
    _count: {
        users: number
    }
    createdAt: string
}

interface Franchise {
    id: string
    name: string
}

export default function LocationsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [locations, setLocations] = useState<Location[]>([])
    const [franchises, setFranchises] = useState<Franchise[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterFranchise, setFilterFranchise] = useState<string>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [requestingLocation, setRequestingLocation] = useState<Location | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        franchiseId: '',
    })
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchLocations()
        fetchFranchises()
    }, [])

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/locations')
            if (res.ok) {
                const data = await res.json()
                setLocations(data)
            }
        } catch (error) {
            console.error('Error fetching locations:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFranchises = async () => {
        try {
            const res = await fetch('/api/franchises')
            if (res.ok) {
                const data = await res.json()
                setFranchises(data)
            }
        } catch (error) {
            console.error('Error fetching franchises:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editingLocation
                ? `/api/locations/${editingLocation.id}`
                : '/api/locations'

            const method = editingLocation ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    franchiseId: formData.franchiseId || null,
                })
            })

            if (res.ok) {
                setToast({
                    message: editingLocation ? 'Location updated!' : 'Location created!',
                    type: 'success'
                })
                fetchLocations()
                closeModal()
            } else {
                setToast({ message: 'Failed to save location', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this location?')) return

        try {
            const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })

            if (res.ok) {
                setToast({ message: 'Location deleted!', type: 'success' })
                fetchLocations()
            } else {
                setToast({ message: 'Failed to delete location', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        }
    }

    const openModal = (location?: Location) => {
        if (location) {
            setEditingLocation(location)
            setFormData({
                name: location.name,
                address: location.address,
                franchiseId: location.franchiseId || '',
            })
        } else {
            setEditingLocation(null)
            setFormData({ name: '', address: '', franchiseId: '' })
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingLocation(null)
        setFormData({ name: '', address: '', franchiseId: '' })
    }

    const filteredLocations = locations.filter(loc => {
        const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.address.toLowerCase().includes(searchTerm.toLowerCase())

        if (filterFranchise === 'all') return matchesSearch
        if (filterFranchise === 'direct') return matchesSearch && !loc.franchiseId
        return matchesSearch && loc.franchiseId === filterFranchise
    })

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Stores</h1>
                    <p className="text-stone-400 mt-1">Manage your store locations</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:scale-105 transition-all"
                >
                    <Plus className="h-5 w-5" />
                    Add Store
                </button>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search stores..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                    </div>
                    {/* Only show filter dropdown for Provider role who manages multiple clients */}
                    {session?.user?.role === 'PROVIDER' && franchises.length > 1 && (
                        <select
                            value={filterFranchise}
                            onChange={(e) => setFilterFranchise(e.target.value)}
                            className="px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                            <option value="all">All Clients</option>
                            {franchises.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Locations Grid */}
            {filteredLocations.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center">
                    <div className="h-16 w-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MapPin className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-100 mb-2">No stores yet</h3>
                    <p className="text-stone-400 mb-6">
                        Add your first store to get started! Click the "Add Store" button to create a location.
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-emerald-900/40 hover:scale-105 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Add Your First Store
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLocations.map((location) => (
                        <div
                            key={location.id}
                            className="glass-panel p-6 rounded-2xl hover:border-emerald-500/30 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center border bg-emerald-500/20 border-emerald-500/20">
                                    <MapPin className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRequestingLocation(location)}
                                        className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors group/btn"
                                        title="Request Stations"
                                    >
                                        <Monitor className="h-4 w-4 text-stone-400 group-hover/btn:text-purple-400" />
                                    </button>
                                    <button
                                        onClick={() => openModal(location)}
                                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4 text-stone-400 hover:text-stone-200" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(location.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-stone-100 mb-1 relative z-10 group-hover:text-emerald-400 transition-colors">{location.name}</h3>
                            <p className="text-sm text-stone-400 mb-4 relative z-10">{location.address}</p>

                            <div className="flex items-center justify-between text-sm pt-4 border-t border-stone-800 relative z-10">
                                <span className="text-emerald-400 font-medium">Active</span>
                                <div className="text-stone-400">
                                    <span className="font-medium text-stone-200">{location._count.users}</span> Employees
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredLocations.length === 0 && (
                <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                    <p className="text-stone-400">No locations found</p>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingLocation ? 'Edit Store' : 'Add Store'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Store Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="Enter location name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Address *
                        </label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="Enter address"
                        />
                    </div>

                    {/* Only show franchise selection for Provider managing multiple clients */}
                    {session?.user?.role === 'PROVIDER' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Assign to Client
                            </label>
                            <select
                                value={formData.franchiseId}
                                onChange={(e) => setFormData({ ...formData, franchiseId: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                <option value="">Select a client's business</option>
                                {franchises.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg hover:shadow-emerald-900/20 text-white font-medium px-4 py-3 rounded-xl transition-all"
                        >
                            {editingLocation ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            <RequestStationsModal
                isOpen={!!requestingLocation}
                onClose={() => setRequestingLocation(null)}
                locationId={requestingLocation?.id || ''}
                locationName={requestingLocation?.name || ''}
                onSuccess={() => setToast({ message: 'Request submitted successfully!', type: 'success' })}
            />

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
