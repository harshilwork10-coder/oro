'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Edit2, Trash2, DollarSign, Clock, Calendar, Search, Sparkles, ChevronDown, ChevronUp, Zap, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ServicePackage {
    id: string
    name: string
    description?: string
    serviceId: string
    service: {
        id: string
        name: string
        price: number
        duration: number
    }
    sessionsIncluded: number
    price: number
    validityDays: number
    isActive: boolean
    _count: { purchases: number }
}

interface Service {
    id: string
    name: string
    price: number
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<ServicePackage[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        serviceId: '',
        sessionsIncluded: 5,
        price: '',
        validityDays: 365
    })

    // AI Suggestions state
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [suggestionsLoading, setSuggestionsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(true)
    const [expandedService, setExpandedService] = useState<string | null>(null)

    useEffect(() => {
        fetchPackages()
        fetchServices()
        fetchSuggestions()
    }, [])

    const fetchPackages = async () => {
        try {
            const res = await fetch('/api/packages')
            if (res.ok) {
                const data = await res.json()
                setPackages(data)
            }
        } catch (error) {
            console.error('Failed to fetch packages:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/pos/menu')
            if (res.ok) {
                const data = await res.json()
                setServices(data.services || [])
            }
        } catch (error) {
            console.error('Failed to fetch services:', error)
        }
    }

    const fetchSuggestions = async () => {
        setSuggestionsLoading(true)
        try {
            const res = await fetch('/api/packages/suggestions')
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data.suggestions || [])
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        } finally {
            setSuggestionsLoading(false)
        }
    }

    const createFromSuggestion = async (serviceId: string, serviceName: string, suggestion: any) => {
        const packageData = {
            name: `${serviceName} - ${suggestion.label}`,
            serviceId,
            sessionsIncluded: suggestion.sessions,
            price: suggestion.suggestedPrice.toString(),
            validityDays: 365
        }

        try {
            const res = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(packageData)
            })
            if (res.ok) {
                fetchPackages()
                fetchSuggestions()
            }
        } catch (error) {
            console.error('Failed to create package:', error)
        }
    }

    const openNewModal = () => {
        setEditingPackage(null)
        setFormData({
            name: '',
            description: '',
            serviceId: '',
            sessionsIncluded: 5,
            price: '',
            validityDays: 365
        })
        setShowModal(true)
    }

    const openEditModal = (pkg: ServicePackage) => {
        setEditingPackage(pkg)
        setFormData({
            name: pkg.name,
            description: pkg.description || '',
            serviceId: pkg.serviceId,
            sessionsIncluded: pkg.sessionsIncluded,
            price: String(pkg.price),
            validityDays: pkg.validityDays
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const method = editingPackage ? 'PUT' : 'POST'
        const body = editingPackage
            ? { id: editingPackage.id, ...formData }
            : formData

        try {
            const res = await fetch('/api/packages', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setShowModal(false)
                fetchPackages()
            }
        } catch (error) {
            console.error('Failed to save package:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this package?')) return

        try {
            const res = await fetch(`/api/packages?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchPackages()
            }
        } catch (error) {
            console.error('Failed to delete package:', error)
        }
    }

    const filteredPackages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.service.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const calculateSavings = (pkg: ServicePackage) => {
        const regularTotal = Number(pkg.service.price) * pkg.sessionsIncluded
        const packagePrice = Number(pkg.price)
        return regularTotal - packagePrice
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-indigo-600" />
                        Service Packages
                    </h1>
                    <p className="text-gray-500 mt-1">Create bundles like "Buy 5 massages, get 1 free"</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Package
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* AI Suggestions Panel */}
            {suggestions.length > 0 && (
                <div className="mb-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200 overflow-hidden">
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/30 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">AI Package Suggestions</h3>
                                <p className="text-sm text-gray-600">
                                    {suggestions.length} service{suggestions.length !== 1 ? 's' : ''} with package opportunities
                                </p>
                            </div>
                        </div>
                        {showSuggestions ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                    </button>

                    {showSuggestions && (
                        <div className="px-4 pb-4 space-y-3">
                            {suggestions.slice(0, 5).map((svc) => (
                                <div key={svc.serviceId} className="bg-white rounded-lg border shadow-sm">
                                    <button
                                        onClick={() => setExpandedService(
                                            expandedService === svc.serviceId ? null : svc.serviceId
                                        )}
                                        className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">{svc.serviceName}</p>
                                            <p className="text-sm text-gray-500">
                                                {formatCurrency(svc.servicePrice)}/session • {svc.popularity} sales
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                                {svc.suggestedPackages.length} ideas
                                            </span>
                                            {expandedService === svc.serviceId ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedService === svc.serviceId && (
                                        <div className="px-3 pb-3 grid gap-2 md:grid-cols-3">
                                            {svc.suggestedPackages.map((pkg: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 border rounded-lg bg-gradient-to-br from-gray-50 to-white"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-sm">{pkg.label}</span>
                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                            {pkg.savingsPercent}% off
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">{pkg.reason}</p>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="text-lg font-bold text-indigo-600">
                                                                {formatCurrency(pkg.suggestedPrice)}
                                                            </p>
                                                            <p className="text-xs text-gray-400 line-through">
                                                                {formatCurrency(pkg.regularTotal)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-green-600">
                                                                Save {formatCurrency(pkg.savings)}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {pkg.sessions} sessions
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => createFromSuggestion(
                                                            svc.serviceId,
                                                            svc.serviceName,
                                                            pkg
                                                        )}
                                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1 transition"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                        Create Package
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Packages Grid */}
            {filteredPackages.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No packages found</p>
                    <button
                        onClick={openNewModal}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Create your first package
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPackages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`bg-white rounded-xl shadow-sm border p-6 ${!pkg.isActive ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                                    <p className="text-sm text-gray-500">{pkg.service.name}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {pkg.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {pkg.description && (
                                <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                            )}

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        Sessions
                                    </span>
                                    <span className="font-medium">{pkg.sessionsIncluded}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <DollarSign className="w-4 h-4" />
                                        Package Price
                                    </span>
                                    <span className="font-bold text-lg text-indigo-600">{formatCurrency(Number(pkg.price))}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Valid for
                                    </span>
                                    <span className="font-medium">{pkg.validityDays} days</span>
                                </div>
                            </div>

                            {calculateSavings(pkg) > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-green-800">
                                        <span className="font-semibold">Saves {formatCurrency(calculateSavings(pkg))}</span>
                                        <span className="text-green-600"> vs regular price</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t">
                                <span className="text-xs text-gray-400">{pkg._count.purchases} sold</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(pkg)}
                                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pkg.id)}
                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {editingPackage ? 'Edit Package' : 'Create Package'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Package Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., 5-Session Massage Bundle"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Service
                                </label>
                                <select
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                    disabled={!!editingPackage}
                                >
                                    <option value="">Select a service</option>
                                    {services.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} - {formatCurrency(Number(service.price))}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sessions Included
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.sessionsIncluded}
                                        onChange={(e) => setFormData({ ...formData, sessionsIncluded: parseInt(e.target.value) })}
                                        min="2"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Package Price
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valid for (days)
                                </label>
                                <input
                                    type="number"
                                    value={formData.validityDays}
                                    onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) })}
                                    min="30"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {editingPackage ? 'Save Changes' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

