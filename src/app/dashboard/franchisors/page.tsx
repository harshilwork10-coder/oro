'use client'

import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Eye, Download } from "lucide-react"
import AddFranchisorModal from "@/components/modals/AddFranchisorModal"
import EditClientModal from "@/components/modals/EditClientModal"

type Franchisor = {
    id: string
    name: string
    owner: {
        name: string
        email: string
    }
    _count: {
        franchises: number
    }
    createdAt: string
}

export default function MyClientsPage() {
    const router = useRouter()
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [franchisors, setFranchisors] = useState<Franchisor[]>([])
    const [filteredClients, setFilteredClients] = useState<Franchisor[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingClient, setEditingClient] = useState<Franchisor | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)

    async function fetchFranchisors() {
        try {
            const response = await fetch('/api/franchisors')
            if (response.ok) {
                const data = await response.json()
                setFranchisors(data)
                setFilteredClients(data)
            }
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return
        }

        try {
            const res = await fetch(`/api/admin/clients/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                fetchFranchisors()
            }
        } catch (error) {
            console.error('Error deleting client:', error)
        }
    }

    async function handleExport() {
        try {
            const res = await fetch('/api/admin/clients/export')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
        } catch (error) {
            console.error('Error exporting:', error)
        }
    }

    // Filter and search logic
    useEffect(() => {
        let result = [...franchisors]

        // Search
        if (searchQuery) {
            result = result.filter(client =>
                client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.owner.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Sort
        if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        } else if (sortBy === 'oldest') {
            result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        } else if (sortBy === 'mostLocations') {
            result.sort((a, b) => b._count.franchises - a._count.franchises)
        }

        setFilteredClients(result)
    }, [searchQuery, sortBy, franchisors])

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFranchisors()
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Clients</h1>
                    <p className="text-stone-400 mt-2">Manage your salon owner clients</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-105 transition-all font-medium flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-panel p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search clients by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="mostLocations">Most Locations</option>
                    </select>
                </div>

                {/* Results count */}
                <div className="text-sm text-stone-400">
                    Showing {filteredClients.length} of {franchisors.length} clients
                </div>
            </div>

            {/* Modals */}
            <AddFranchisorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchFranchisors()
                    setIsAddModalOpen(false)
                }}
            />

            {editingClient && (
                <EditClientModal
                    client={editingClient}
                    isOpen={!!editingClient}
                    onClose={() => setEditingClient(null)}
                    onSuccess={() => {
                        fetchFranchisors()
                        setEditingClient(null)
                    }}
                />
            )}

            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <div key={client.id} className="glass-panel p-6 rounded-2xl hover:border-purple-500/30 transition-all group relative overflow-hidden cursor-pointer">
                        <div className="absolute inset- bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                <Building2 className="h-6 w-6 text-purple-400" />
                            </div>

                            {/* Action Menu */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveMenu(activeMenu === client.id ? null : client.id)
                                    }}
                                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5 text-stone-400" />
                                </button>

                                {activeMenu === client.id && (
                                    <div className="absolute right-0 mt-2 w-48 glass-panel rounded-lg shadow-lg border border-stone-700 overflow-hidden z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/franchisors/${client.id}`)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-stone-300"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Details
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingClient(client)
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-stone-300"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Edit Client
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(client.id)
                                                setActiveMenu(null)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-red-900/20 transition-colors flex items-center gap-2 text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Client
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div onClick={() => router.push(`/dashboard/franchisors/${client.id}`)}>
                            <h3 className="text-xl font-bold text-stone-100 mb-1 relative z-10 group-hover:text-purple-400 transition-colors">{client.name}</h3>
                            <p className="text-sm text-stone-400 mb-6 relative z-10">Owner: {client.owner?.name}</p>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center text-sm">
                                    <Building2 className="h-4 w-4 text-stone-500 mr-2" />
                                    <span className="text-stone-300">{client._count.franchises} Location{client._count.franchises !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-stone-500 mr-2">📧</span>
                                    <span className="text-stone-400 truncate">{client.owner.email}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <span className="text-stone-500 mr-2">📅</span>
                                    <span className="text-stone-400">
                                        Joined {new Date(client.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-stone-400">No clients found matching your search</p>
                </div>
            )}
        </div>
    )
}
