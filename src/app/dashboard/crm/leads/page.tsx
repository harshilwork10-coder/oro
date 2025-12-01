'use client'

import { useState, useEffect } from 'react'
import {
    Users, Search, Filter, Plus, Phone, Mail,
    MapPin, DollarSign, Calendar, MoreVertical,
    Eye, Edit, Trash2, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface Lead {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    city: string | null
    state: string | null
    status: string
    source: string | null
    estimatedValue: number | null
    createdAt: string
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [activeMenu, setActiveMenu] = useState<string | null>(null)

    useEffect(() => {
        fetchLeads()
    }, [])

    useEffect(() => {
        let filtered = leads

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(lead =>
                lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(lead => lead.status === statusFilter)
        }

        setFilteredLeads(filtered)
    }, [searchQuery, statusFilter, leads])

    const fetchLeads = async () => {
        try {
            const res = await fetch('/api/crm/leads')
            if (res.ok) {
                const data = await res.json()
                setLeads(data)
                setFilteredLeads(data)
            }
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lead?')) return

        try {
            const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setLeads(leads.filter(l => l.id !== id))
            }
        } catch (error) {
            console.error('Error deleting lead:', error)
        }
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'NEW': 'bg-blue-100 text-blue-700',
            'CONTACTED': 'bg-purple-100 text-purple-700',
            'QUALIFIED': 'bg-emerald-100 text-emerald-700',
            'PROPOSAL': 'bg-amber-100 text-amber-700',
            'NEGOTIATION': 'bg-orange-100 text-orange-700',
            'CLOSED_WON': 'bg-green-100 text-green-700',
            'CLOSED_LOST': 'bg-red-100 text-red-700'
        }
        return colors[status] || 'bg-stone-100 text-stone-700'
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Leads</h1>
                    <p className="text-stone-500 mt-1">Manage your franchise sales prospects</p>
                </div>
                <Link href="/dashboard/crm/leads/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Lead
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none bg-white"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="PROPOSAL">Proposal Sent</option>
                            <option value="NEGOTIATION">In Negotiation</option>
                            <option value="CLOSED_WON">Closed Won</option>
                            <option value="CLOSED_LOST">Closed Lost</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-stone-500">
                    <span className="font-medium">Showing {filteredLeads.length} of {leads.length} leads</span>
                </div>
            </div>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-12 text-center">
                    <Users className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-stone-900 mb-2">No leads found</h3>
                    <p className="text-stone-500 mb-6">Get started by adding your first franchise prospect</p>
                    <Link href="/dashboard/crm/leads/new" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                        <Plus className="h-4 w-4" /> Add Lead
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredLeads.map((lead) => (
                        <div key={lead.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                            {lead.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-stone-900">{lead.name}</h3>
                                            {lead.company && <p className="text-sm text-stone-500">{lead.company}</p>}
                                        </div>
                                        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                            {lead.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2 text-sm text-stone-600">
                                            <Mail className="h-4 w-4 text-stone-400" />
                                            <span>{lead.email}</span>
                                        </div>
                                        {lead.phone && (
                                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                                <Phone className="h-4 w-4 text-stone-400" />
                                                <span>{lead.phone}</span>
                                            </div>
                                        )}
                                        {(lead.city || lead.state) && (
                                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                                <MapPin className="h-4 w-4 text-stone-400" />
                                                <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                        {lead.estimatedValue && (
                                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                                <DollarSign className="h-4 w-4 text-stone-400" />
                                                <span className="font-medium">${lead.estimatedValue.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Added {new Date(lead.createdAt).toLocaleDateString()}
                                        </span>
                                        {lead.source && (
                                            <span className="flex items-center gap-1">
                                                <TrendingUp className="h-3 w-3" />
                                                {lead.source}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Menu */}
                                <div className="relative ml-4">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)}
                                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                        <MoreVertical className="h-5 w-5 text-stone-400" />
                                    </button>
                                    {activeMenu === lead.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
                                            <Link
                                                href={`/dashboard/crm/leads/${lead.id}`}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                            >
                                                <Eye className="h-4 w-4" /> View Details
                                            </Link>
                                            <Link
                                                href={`/dashboard/crm/leads/${lead.id}/edit`}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                            >
                                                <Edit className="h-4 w-4" /> Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(lead.id)}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
