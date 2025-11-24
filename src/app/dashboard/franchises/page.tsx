'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Plus, Search, Edit2, Trash2, Building2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'

interface Franchise {
    id: string
    name: string
    createdAt: string
    _count: {
        locations: number
        users: number
    }
}

export default function FranchisesPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [franchises, setFranchises] = useState<Franchise[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null)
    const [franchiseName, setFranchiseName] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchFranchises()
    }, [])

    const fetchFranchises = async () => {
        try {
            const res = await fetch('/api/franchises')
            if (res.ok) {
                const data = await res.json()
                setFranchises(data)
            }
        } catch (error) {
            console.error('Error fetching franchises:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editingFranchise
                ? `/api/franchises/${editingFranchise.id}`
                : '/api/franchises'

            const method = editingFranchise ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: franchiseName })
            })

            if (res.ok) {
                setToast({
                    message: editingFranchise ? 'Franchise updated!' : 'Franchise created!',
                    type: 'success'
                })
                fetchFranchises()
                closeModal()
            } else {
                setToast({ message: 'Failed to save franchise', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this franchise?')) return

        try {
            const res = await fetch(`/api/franchises/${id}`, { method: 'DELETE' })

            if (res.ok) {
                setToast({ message: 'Franchise deleted!', type: 'success' })
                fetchFranchises()
            } else {
                setToast({ message: 'Failed to delete franchise', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        }
    }

    const openModal = (franchise?: Franchise) => {
        if (franchise) {
            setEditingFranchise(franchise)
            setFranchiseName(franchise.name)
        } else {
            setEditingFranchise(null)
            setFranchiseName('')
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingFranchise(null)
        setFranchiseName('')
    }

    const filteredFranchises = franchises.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Franchises</h1>
                    <p className="text-stone-400 mt-1">Manage your franchise network</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-lg shadow-orange-900/20"
                >
                    <Plus className="h-5 w-5" />
                    Add Franchise
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                <input
                    type="text"
                    placeholder="Search franchises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-800 text-stone-100 placeholder-stone-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
            </div>

            {/* Franchises Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFranchises.map((franchise) => (
                    <div
                        key={franchise.id}
                        className="glass-panel rounded-xl p-6 hover:border-orange-500/30 transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openModal(franchise)}
                                    className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                >
                                    <Edit2 className="h-4 w-4 text-stone-400" />
                                </button>
                                <button
                                    onClick={() => handleDelete(franchise.id)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-stone-100 mb-2">{franchise.name}</h3>

                        <div className="flex gap-4 text-sm text-stone-400">
                            <div>
                                <span className="font-medium text-stone-100">{franchise._count.locations}</span> Locations
                            </div>
                            <div>
                                <span className="font-medium text-stone-100">{franchise._count.users}</span> Users
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredFranchises.length === 0 && (
                <div className="text-center py-12 glass-panel rounded-xl">
                    <Building2 className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                    <p className="text-stone-400">No franchises found</p>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingFranchise ? 'Edit Franchise' : 'Add Franchise'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Franchise Name
                        </label>
                        <input
                            type="text"
                            value={franchiseName}
                            onChange={(e) => setFranchiseName(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Enter franchise name"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 px-4 py-2 border border-stone-800 rounded-lg hover:bg-stone-900 transition-colors text-stone-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-orange-900/20"
                        >
                            {editingFranchise ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

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
