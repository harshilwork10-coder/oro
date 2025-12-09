'use client'

import { useState, useEffect } from 'react'
import { Armchair, Plus, Edit2, Trash2, LayoutGrid, DoorOpen, Settings2 } from 'lucide-react'

interface Resource {
    id: string
    name: string
    type: 'CHAIR' | 'ROOM' | 'EQUIPMENT'
    description?: string
    capacity: number
    isActive: boolean
    sortOrder: number
}

const TYPE_ICONS = {
    CHAIR: Armchair,
    ROOM: DoorOpen,
    EQUIPMENT: Settings2
}

const TYPE_COLORS = {
    CHAIR: 'bg-blue-100 text-blue-700 border-blue-200',
    ROOM: 'bg-purple-100 text-purple-700 border-purple-200',
    EQUIPMENT: 'bg-orange-100 text-orange-700 border-orange-200'
}

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingResource, setEditingResource] = useState<Resource | null>(null)
    const [filterType, setFilterType] = useState<string>('ALL')

    const [formData, setFormData] = useState({
        name: '',
        type: 'CHAIR',
        description: '',
        capacity: 1
    })

    useEffect(() => {
        fetchResources()
    }, [])

    const fetchResources = async () => {
        try {
            const res = await fetch('/api/resources')
            if (res.ok) {
                const data = await res.json()
                setResources(data)
            }
        } catch (error) {
            console.error('Failed to fetch resources:', error)
        } finally {
            setLoading(false)
        }
    }

    const openNewModal = (type: string = 'CHAIR') => {
        setEditingResource(null)
        setFormData({
            name: '',
            type,
            description: '',
            capacity: 1
        })
        setShowModal(true)
    }

    const openEditModal = (resource: Resource) => {
        setEditingResource(resource)
        setFormData({
            name: resource.name,
            type: resource.type,
            description: resource.description || '',
            capacity: resource.capacity
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const method = editingResource ? 'PUT' : 'POST'
        const body = editingResource
            ? { id: editingResource.id, ...formData }
            : formData

        try {
            const res = await fetch('/api/resources', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setShowModal(false)
                fetchResources()
            }
        } catch (error) {
            console.error('Failed to save resource:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this resource?')) return

        try {
            const res = await fetch(`/api/resources?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchResources()
            }
        } catch (error) {
            console.error('Failed to delete resource:', error)
        }
    }

    const filteredResources = filterType === 'ALL'
        ? resources
        : resources.filter(r => r.type === filterType)

    const resourceCounts = {
        CHAIR: resources.filter(r => r.type === 'CHAIR').length,
        ROOM: resources.filter(r => r.type === 'ROOM').length,
        EQUIPMENT: resources.filter(r => r.type === 'EQUIPMENT').length
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
                        <LayoutGrid className="w-8 h-8 text-indigo-600" />
                        Resources
                    </h1>
                    <p className="text-gray-500 mt-1">Manage chairs, rooms, and equipment for scheduling</p>
                </div>
                <button
                    onClick={() => openNewModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Resource
                </button>
            </div>

            {/* Type Filters & Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <button
                    onClick={() => setFilterType('ALL')}
                    className={`p-4 rounded-xl border text-left transition ${filterType === 'ALL' ? 'bg-indigo-50 border-indigo-300' : 'bg-white hover:bg-gray-50'
                        }`}
                >
                    <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
                    <p className="text-sm text-gray-500">All Resources</p>
                </button>
                {(['CHAIR', 'ROOM', 'EQUIPMENT'] as const).map((type) => {
                    const Icon = TYPE_ICONS[type]
                    return (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`p-4 rounded-xl border text-left transition ${filterType === type ? TYPE_COLORS[type] : 'bg-white hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-5 h-5" />
                                <p className="text-2xl font-bold">{resourceCounts[type]}</p>
                            </div>
                            <p className="text-sm opacity-75">{type.charAt(0) + type.slice(1).toLowerCase()}s</p>
                        </button>
                    )
                })}
            </div>

            {/* Resources Grid */}
            {filteredResources.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <LayoutGrid className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No resources found</p>
                    <div className="mt-4 flex justify-center gap-3">
                        <button
                            onClick={() => openNewModal('CHAIR')}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            <Armchair className="w-4 h-4" /> Add Chair
                        </button>
                        <button
                            onClick={() => openNewModal('ROOM')}
                            className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                            <DoorOpen className="w-4 h-4" /> Add Room
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredResources.map((resource) => {
                        const Icon = TYPE_ICONS[resource.type]
                        return (
                            <div
                                key={resource.id}
                                className={`bg-white rounded-xl shadow-sm border p-4 ${!resource.isActive ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${TYPE_COLORS[resource.type]}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditModal(resource)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(resource.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                                {resource.description && (
                                    <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
                                )}

                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Capacity</span>
                                    <span className="font-medium">{resource.capacity}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {editingResource ? 'Edit Resource' : 'Add Resource'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Chair 1, Room A"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    disabled={!!editingResource}
                                >
                                    <option value="CHAIR">Chair / Station</option>
                                    <option value="ROOM">Room</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Capacity
                                </label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="e.g., Near window, with massage table"
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
                                    {editingResource ? 'Save Changes' : 'Add Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
