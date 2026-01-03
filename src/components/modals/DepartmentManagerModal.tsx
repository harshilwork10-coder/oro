'use client'

import { useState, useEffect } from 'react'
import {
    X, Plus, Trash2, ChevronDown, ChevronRight,
    Folder, FolderOpen, AlertTriangle, Check
} from 'lucide-react'

interface Category {
    id: string
    name: string
    ageRestricted: boolean
    minimumAge: number | null
    _count: { products: number }
}

interface Department {
    id: string
    name: string
    description?: string
    icon?: string
    color?: string
    ageRestricted: boolean
    minimumAge?: number | null
    categories: Category[]
}

interface DepartmentManagerModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void
}

export default function DepartmentManagerModal({
    isOpen,
    onClose,
    onUpdate
}: DepartmentManagerModalProps) {
    const [departments, setDepartments] = useState<Department[]>([])
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // New department form
    const [newDeptName, setNewDeptName] = useState('')

    // New category form (per department)
    const [addingCategoryTo, setAddingCategoryTo] = useState<string | null>(null)
    const [newCatName, setNewCatName] = useState('')
    const [newCatAgeRestricted, setNewCatAgeRestricted] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadDepartments()
        }
    }, [isOpen])

    const loadDepartments = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/inventory/departments')
            if (res.ok) {
                const data = await res.json()
                setDepartments(data.departments || [])
            }
        } catch (error) {
            console.error('Failed to load departments:', error)
        }
        setLoading(false)
    }

    const handleAddDepartment = async () => {
        if (!newDeptName.trim()) return

        setSaving(true)
        try {
            const res = await fetch('/api/inventory/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newDeptName.trim(),
                    ageRestricted: false,
                    minimumAge: null
                })
            })

            if (res.ok) {
                setNewDeptName('')
                loadDepartments()
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to add department:', error)
        }
        setSaving(false)
    }

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm('Delete this department? Categories will be unassigned.')) return

        try {
            const res = await fetch(`/api/inventory/departments?id=${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                loadDepartments()
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to delete department:', error)
        }
    }

    const handleAddCategory = async (departmentId: string) => {
        if (!newCatName.trim()) return

        setSaving(true)
        try {
            const res = await fetch('/api/inventory/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCatName.trim(),
                    ageRestricted: newCatAgeRestricted,
                    minimumAge: newCatAgeRestricted ? 21 : null,
                    departmentId
                })
            })

            if (res.ok) {
                setNewCatName('')
                setNewCatAgeRestricted(false)
                setAddingCategoryTo(null)
                loadDepartments()
                onUpdate()
            }
        } catch (error) {
            console.error('Failed to add category:', error)
        }
        setSaving(false)
    }

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedDepts)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedDepts(newExpanded)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-stone-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                    <h2 className="text-xl font-bold text-white">Manage Departments & Categories</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {/* Add New Department */}
                    <div className="mb-6 p-4 bg-stone-800 rounded-lg border border-stone-700">
                        <h3 className="text-sm font-semibold text-stone-400 mb-3">Add New Department</h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="Department name (e.g., Beverages)"
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white"
                                />
                            </div>
                            <button
                                onClick={handleAddDepartment}
                                disabled={saving || !newDeptName.trim()}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-stone-600 rounded-lg flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Add New Category (Global) */}
                    <div className="mb-6 p-4 bg-stone-800 rounded-lg border border-stone-700">
                        <h3 className="text-sm font-semibold text-stone-400 mb-3">Add New Category</h3>
                        <div className="flex gap-3 items-end">
                            <div className="w-1/3">
                                <select
                                    value={addingCategoryTo || ''}
                                    onChange={(e) => setAddingCategoryTo(e.target.value || null)}
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white appearance-none"
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder="Category name (e.g., Vodka)"
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white"
                                />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newCatAgeRestricted}
                                        onChange={(e) => setNewCatAgeRestricted(e.target.checked)}
                                        className="rounded border-stone-600 bg-stone-900"
                                    />
                                    21+
                                </label>
                            </div>
                            <button
                                onClick={() => addingCategoryTo && handleAddCategory(addingCategoryTo)}
                                disabled={saving || !newCatName.trim() || !addingCategoryTo}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-600 rounded-lg flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Department List */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
                        </div>
                    ) : departments.length === 0 ? (
                        <div className="text-center py-8 text-stone-500">
                            No departments yet. Add one above!
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {departments.map(dept => (
                                <div key={dept.id} className="bg-stone-800 rounded-lg border border-stone-700 overflow-hidden">
                                    {/* Department Header */}
                                    <div className="flex items-center p-3 hover:bg-stone-700/50">
                                        <button
                                            onClick={() => toggleExpand(dept.id)}
                                            className="p-1 hover:bg-stone-600 rounded"
                                        >
                                            {expandedDepts.has(dept.id) ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {expandedDepts.has(dept.id) ? (
                                            <FolderOpen className="h-5 w-5 ml-2 text-orange-400" />
                                        ) : (
                                            <Folder className="h-5 w-5 ml-2 text-orange-400" />
                                        )}

                                        <span className="ml-3 font-medium flex-1">{dept.name}</span>

                                        <span className="text-sm text-stone-500 mr-3">
                                            {dept.categories.length} categories
                                        </span>

                                        <button
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Categories (expanded) */}
                                    {expandedDepts.has(dept.id) && (
                                        <div className="bg-stone-900/50 border-t border-stone-700 p-3">
                                            {dept.categories.length === 0 ? (
                                                <p className="text-sm text-stone-500 pl-8">No categories yet</p>
                                            ) : (
                                                <div className="space-y-1 mb-3">
                                                    {dept.categories.map(cat => (
                                                        <div key={cat.id} className="flex items-center pl-8 py-1 text-sm">
                                                            <span className="flex-1">{cat.name}</span>
                                                            {cat.ageRestricted && (
                                                                <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full mr-2">
                                                                    {cat.minimumAge}+
                                                                </span>
                                                            )}
                                                            <span className="text-stone-500">
                                                                {cat._count.products} items
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add Category Form */}
                                            {addingCategoryTo === dept.id ? (
                                                <div className="flex gap-2 pl-8 mt-2">
                                                    <input
                                                        type="text"
                                                        value={newCatName}
                                                        onChange={(e) => setNewCatName(e.target.value)}
                                                        placeholder="Category name"
                                                        className="flex-1 px-2 py-1 text-sm bg-stone-800 border border-stone-600 rounded"
                                                        autoFocus
                                                    />
                                                    <label className="flex items-center gap-1 text-xs text-stone-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={newCatAgeRestricted}
                                                            onChange={(e) => setNewCatAgeRestricted(e.target.checked)}
                                                            className="rounded"
                                                        />
                                                        21+
                                                    </label>
                                                    <button
                                                        onClick={() => handleAddCategory(dept.id)}
                                                        disabled={!newCatName.trim()}
                                                        className="p-1 bg-green-600 hover:bg-green-500 disabled:bg-stone-600 rounded"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAddingCategoryTo(null)
                                                            setNewCatName('')
                                                        }}
                                                        className="p-1 hover:bg-stone-700 rounded"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setAddingCategoryTo(dept.id)}
                                                    className="flex items-center gap-1 pl-8 text-sm text-orange-400 hover:text-orange-300"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Category
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-stone-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

