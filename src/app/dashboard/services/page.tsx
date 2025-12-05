'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Plus, Edit, Trash2, X, Settings, Lock, Building2 } from 'lucide-react'

export default function ServicesPage() {
    const [services, setServices] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingService, setEditingService] = useState<any>(null)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const [selectedCategory, setSelectedCategory] = useState('ALL')
    const [loading, setLoading] = useState(true)
    const [categoryName, setCategoryName] = useState('')
    const [formData, setFormData] = useState({ name: '', categoryId: '', price: '', duration: '30', description: '' })

    // Franchise detection - if user belongs to a franchisee, they can only view
    const [isFranchise, setIsFranchise] = useState(false)
    const [franchiseName, setFranchiseName] = useState('')

    useEffect(() => {
        fetchServices()
        fetchCategories()
        checkUserType()
    }, [])

    const checkUserType = async () => {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const user = await res.json()
                // If user has franchiseeId, they're a franchise location (read-only)
                setIsFranchise(!!user.franchiseeId)
                setFranchiseName(user.franchise?.name || user.franchisee?.franchise?.name || '')
            }
        } catch (error) {
            console.error('Failed to check user type:', error)
        }
    }

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/franchise/services')
            const data = await res.json()
            setServices(data || [])
        } catch (error) {
            console.error('Failed to fetch services:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/service-categories')
            const data = await res.json()
            // Only set if it's an array, otherwise keep empty array
            setCategories(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Failed to fetch categories:', error)
            setCategories([])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const url = '/api/franchise/services'
        const method = editingService ? 'PUT' : 'POST'
        const body = editingService
            ? { id: editingService.id, ...formData, price: parseFloat(formData.price), duration: parseInt(formData.duration) }
            : { ...formData, price: parseFloat(formData.price), duration: parseInt(formData.duration) }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.ok) {
                await fetchServices()
                setShowModal(false)
                setEditingService(null)
                setFormData({ name: '', categoryId: '', price: '', duration: '30', description: '' })
            }
        } catch (error) {
            console.error('Failed to save service:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return
        try {
            const res = await fetch('/api/franchise/services', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) await fetchServices()
        } catch (error) {
            console.error('Failed to delete service:', error)
        }
    }

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const url = '/api/service-categories'
        const method = editingCategory ? 'PUT' : 'POST'
        const body = editingCategory ? { id: editingCategory.id, name: categoryName } : { name: categoryName }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.ok) {
                await fetchCategories()
                setCategoryName('')
                setEditingCategory(null)
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to save category')
            }
        } catch (error) {
            console.error('Failed to save category:', error)
            alert('Failed to save category')
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category? This cannot be undone.')) return
        try {
            const res = await fetch('/api/service-categories', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                await fetchCategories()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to delete category')
            }
        } catch (error) {
            console.error('Failed to delete category:', error)
        }
    }

    const openEdit = (service: any) => {
        setEditingService(service)
        setFormData({
            name: service.name,
            categoryId: service.categoryId || '',
            price: service.price.toString(),
            duration: service.duration?.toString() || '30',
            description: service.description || ''
        })
        setShowModal(true)
    }

    const openEditCategory = (category: any) => {
        setEditingCategory(category)
        setCategoryName(category.name)
    }

    const filtered = selectedCategory === 'ALL'
        ? services
        : services.filter(s => s.categoryId === selectedCategory || (!s.categoryId && s.category === selectedCategory))

    if (loading) return <div className="flex items-center justify-center h-screen bg-stone-950"><div className="text-orange-500 text-xl">Loading...</div></div>

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            {/* Franchise vs Multi-Store Badge */}
            {isFranchise ? (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-400" />
                    <div>
                        <p className="text-amber-200 font-semibold">Managed by {franchiseName || 'Franchisor'}</p>
                        <p className="text-amber-400/70 text-sm">Menu is controlled by headquarters. Contact your franchisor for changes.</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                    <div>
                        <p className="text-emerald-200 font-semibold">Your Custom Menu</p>
                        <p className="text-emerald-400/70 text-sm">You have full control over your services and pricing.</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-orange-500" />
                        Service Management
                    </h1>
                    <p className="text-stone-400 mt-2">
                        {isFranchise ? 'View services and pricing' : 'Manage services and pricing'}
                    </p>
                </div>
                {!isFranchise && (
                    <div className="flex gap-3">
                        <button onClick={() => setShowCategoryModal(true)} className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Manage Categories
                        </button>
                        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Add Service
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-2 rounded-lg ${selectedCategory === 'ALL' ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-400'}`}>All</button>
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-lg ${selectedCategory === cat.id ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-400'}`}>{cat.name}</button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Open Item - Always available for custom pricing */}
                <div className="glass-panel p-6 rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-500/5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                                💰 Open Item
                            </h3>
                            <p className="text-xs text-purple-400/70 uppercase">CUSTOM PRICE</p>
                        </div>
                        <div className="px-2 py-1 bg-purple-600/30 rounded-lg text-purple-300 text-xs font-medium">
                            Flexible
                        </div>
                    </div>
                    <p className="text-sm text-stone-400 mb-4">Enter any custom amount for miscellaneous services</p>
                    <div className="text-center py-3 bg-purple-600/20 rounded-lg">
                        <span className="text-purple-300 font-semibold">$?.??</span>
                        <p className="text-xs text-purple-400/70 mt-1">Price entered at checkout</p>
                    </div>
                </div>

                {filtered.map(service => (
                    <div key={service.id} className="glass-panel p-6 rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{service.name}</h3>
                                <p className="text-xs text-stone-500 uppercase">
                                    {service.serviceCategory?.name || service.category || 'UNCATEGORIZED'}
                                </p>
                            </div>
                            {!isFranchise && (
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(service)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-orange-400">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(service.id)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-red-400">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {service.description && <p className="text-sm text-stone-400 mb-4">{service.description}</p>}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-xs text-stone-500">Cash:</span>
                                <span className="text-sm font-bold text-emerald-400">${Number(service.price).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-stone-500">Card:</span>
                                <span className="text-sm font-bold text-stone-300">${(Number(service.price) * 1.0399).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Service Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">{editingService ? 'Edit' : 'Add'} Service</h2>
                            <button onClick={() => { setShowModal(false); setEditingService(null); setFormData({ name: '', categoryId: '', price: '', duration: '30', description: '' }); }} className="text-stone-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Name</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Category</label>
                                    <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white">
                                        <option value="">Select Category</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Price</label>
                                    <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Duration (min)</label>
                                <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowModal(false); setEditingService(null); }} className="flex-1 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Manage Categories</h2>
                            <button onClick={() => { setShowCategoryModal(false); setCategoryName(''); setEditingCategory(null); }} className="text-stone-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCategorySubmit} className="mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="Category name (e.g., WAXING)"
                                    className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white placeholder-stone-600"
                                />
                                <button type="submit" className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold">
                                    {editingCategory ? 'Update' : 'Add'}
                                </button>
                                {editingCategory && (
                                    <button type="button" onClick={() => { setCategoryName(''); setEditingCategory(null); }} className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {categories.length === 0 ? (
                                <p className="text-stone-500 text-center py-8">No categories yet. Add one above!</p>
                            ) : (
                                categories.map(category => (
                                    <div key={category.id} className="flex items-center justify-between p-3 bg-stone-950 rounded-lg border border-stone-800">
                                        <span className="text-white font-medium">{category.name}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditCategory(category)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-orange-400">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDeleteCategory(category.id)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
