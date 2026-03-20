'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    GripVertical,
    Pin,
    PinOff,
    Search,
    Save,
    Plus,
    X,
    Loader2,
    Settings2,
    Tag
} from 'lucide-react'
import Toast from '@/components/ui/Toast'

interface Category {
    id: string
    name: string
    itemCount?: number
}

interface QuickFilter {
    label: string
    keywords: string[]
}

interface LayoutConfig {
    pinnedCategoryIds: string[]
    categoryOverrides: Record<string, { color?: string; icon?: string }>
    quickFilters: Record<string, QuickFilter[]>
}

const DEFAULT_ICONS = ['📦', '🍺', '🥃', '🍷', '🚬', '🍫', '🥤', '🧊', '🧹', '🔋', '💊', '🎰', '🍔', '🥩', '🧀', '🥛']
const DEFAULT_COLORS = [
    '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#059669',
    '#DB2777', '#EA580C', '#0891B2', '#4F46E5', '#65A30D'
]

export default function PosLayoutPage() {
    const { data: session } = useSession()
    const user = session?.user as any
    const router = useRouter()

    const [categories, setCategories] = useState<Category[]>([])
    const [config, setConfig] = useState<LayoutConfig>({
        pinnedCategoryIds: [],
        categoryOverrides: {},
        quickFilters: {}
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [editingFilters, setEditingFilters] = useState<string | null>(null)
    const [newFilterLabel, setNewFilterLabel] = useState('')
    const [newFilterKeywords, setNewFilterKeywords] = useState('')
    const [editingIcon, setEditingIcon] = useState<string | null>(null)
    const [editingColor, setEditingColor] = useState<string | null>(null)

    // Restrict to manager+ roles
    const canEdit = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user?.role)

    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                const [catRes, layoutRes] = await Promise.all([
                    fetch('/api/inventory/categories?take=200'),
                    fetch('/api/pos/retail/layout')
                ])
                if (catRes.ok) {
                    const data = await catRes.json()
                    const items = data?.data || data?.categories || data || []
                    setCategories(Array.isArray(items) ? items : [])
                }
                if (layoutRes.ok) {
                    const data = await layoutRes.json()
                    if (data?.data?.config) {
                        setConfig(data.data.config)
                    }
                }
            } catch (e) {
                console.error('Failed to load:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Toggle pin
    const togglePin = useCallback((catId: string) => {
        setConfig(prev => {
            const pinned = [...prev.pinnedCategoryIds]
            const idx = pinned.indexOf(catId)
            if (idx >= 0) {
                pinned.splice(idx, 1)
            } else if (pinned.length < 12) {
                pinned.push(catId)
            } else {
                return prev // Max 12
            }
            return { ...prev, pinnedCategoryIds: pinned }
        })
    }, [])

    // Move pinned item
    const movePinned = useCallback((catId: string, direction: 'up' | 'down') => {
        setConfig(prev => {
            const pinned = [...prev.pinnedCategoryIds]
            const idx = pinned.indexOf(catId)
            if (direction === 'up' && idx > 0) {
                [pinned[idx - 1], pinned[idx]] = [pinned[idx], pinned[idx - 1]]
            } else if (direction === 'down' && idx < pinned.length - 1) {
                [pinned[idx], pinned[idx + 1]] = [pinned[idx + 1], pinned[idx]]
            }
            return { ...prev, pinnedCategoryIds: pinned }
        })
    }, [])

    // Set icon/color override
    const setCategoryOverride = useCallback((catId: string, key: 'icon' | 'color', value: string) => {
        setConfig(prev => ({
            ...prev,
            categoryOverrides: {
                ...prev.categoryOverrides,
                [catId]: { ...prev.categoryOverrides[catId], [key]: value }
            }
        }))
    }, [])

    // Add quick filter
    const addQuickFilter = useCallback((catId: string) => {
        if (!newFilterLabel.trim()) return
        const keywords = newFilterKeywords.split(',').map(k => k.trim()).filter(Boolean)
        if (keywords.length === 0) return

        setConfig(prev => ({
            ...prev,
            quickFilters: {
                ...prev.quickFilters,
                [catId]: [...(prev.quickFilters[catId] || []), { label: newFilterLabel.trim(), keywords }]
            }
        }))
        setNewFilterLabel('')
        setNewFilterKeywords('')
    }, [newFilterLabel, newFilterKeywords])

    // Remove quick filter
    const removeQuickFilter = useCallback((catId: string, index: number) => {
        setConfig(prev => ({
            ...prev,
            quickFilters: {
                ...prev.quickFilters,
                [catId]: (prev.quickFilters[catId] || []).filter((_, i) => i !== index)
            }
        }))
    }, [])

    // Save
    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/pos/retail/layout', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            if (res.ok) {
                setToast({ message: 'Layout saved! All terminals will update on refresh.', type: 'success' })
            } else {
                setToast({ message: 'Failed to save layout', type: 'error' })
            }
        } catch (e) {
            setToast({ message: 'Network error', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const filteredCategories = categories.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase())
    )

    const pinnedCats = config.pinnedCategoryIds
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean) as Category[]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="sticky top-0 z-10 bg-stone-900 border-b border-stone-800">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">POS Register Layout</h1>
                            <p className="text-xs text-stone-400">Configure department buttons & quick filters for all terminals</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !canEdit}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Layout
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

                {/* Pinned Departments Section */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
                            Pinned Departments ({pinnedCats.length}/12)
                        </h2>
                        <span className="text-xs text-stone-500">These appear as tabs on the POS screen</span>
                    </div>
                    {pinnedCats.length === 0 ? (
                        <div className="flex items-center justify-center py-8 bg-stone-900 rounded-xl border border-dashed border-stone-700">
                            <p className="text-stone-500 text-sm">No departments pinned yet. Pin departments from the list below.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {pinnedCats.map((cat, idx) => {
                                const override = config.categoryOverrides[cat.id]
                                return (
                                    <div key={cat.id} className="flex items-center gap-2 p-3 bg-stone-900 rounded-lg border border-stone-800">
                                        <GripVertical className="h-4 w-4 text-stone-600 flex-shrink-0" />
                                        <span className="text-lg flex-shrink-0">{override?.icon || '📦'}</span>
                                        <span className="font-medium flex-1">{cat.name}</span>

                                        {/* Icon Picker */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setEditingIcon(editingIcon === cat.id ? null : cat.id)}
                                                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs"
                                            >
                                                Icon
                                            </button>
                                            {editingIcon === cat.id && (
                                                <div className="absolute right-0 top-full mt-1 bg-stone-800 rounded-lg p-2 grid grid-cols-8 gap-1 z-20 border border-stone-700 shadow-xl">
                                                    {DEFAULT_ICONS.map(icon => (
                                                        <button
                                                            key={icon}
                                                            onClick={() => { setCategoryOverride(cat.id, 'icon', icon); setEditingIcon(null) }}
                                                            className="w-8 h-8 hover:bg-stone-700 rounded flex items-center justify-center text-lg"
                                                        >{icon}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Color Picker */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setEditingColor(editingColor === cat.id ? null : cat.id)}
                                                className="w-6 h-6 rounded border-2 border-stone-600"
                                                style={{ backgroundColor: override?.color || '#57534e' }}
                                            />
                                            {editingColor === cat.id && (
                                                <div className="absolute right-0 top-full mt-1 bg-stone-800 rounded-lg p-2 grid grid-cols-5 gap-1 z-20 border border-stone-700 shadow-xl">
                                                    {DEFAULT_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => { setCategoryOverride(cat.id, 'color', color); setEditingColor(null) }}
                                                            className="w-7 h-7 rounded-full border-2 border-stone-600 hover:border-white transition-colors"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reorder */}
                                        <button
                                            onClick={() => movePinned(cat.id, 'up')}
                                            disabled={idx === 0}
                                            className="px-1.5 py-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded text-xs"
                                        >▲</button>
                                        <button
                                            onClick={() => movePinned(cat.id, 'down')}
                                            disabled={idx === pinnedCats.length - 1}
                                            className="px-1.5 py-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded text-xs"
                                        >▼</button>

                                        {/* Quick Filters */}
                                        <button
                                            onClick={() => setEditingFilters(editingFilters === cat.id ? null : cat.id)}
                                            className={`px-2 py-1 rounded text-xs transition-colors ${(config.quickFilters[cat.id]?.length || 0) > 0
                                                ? 'bg-orange-500/20 text-orange-400'
                                                : 'bg-stone-800 hover:bg-stone-700'
                                                }`}
                                        >
                                            <Tag className="h-3 w-3 inline mr-1" />
                                            Filters ({config.quickFilters[cat.id]?.length || 0})
                                        </button>

                                        {/* Unpin */}
                                        <button
                                            onClick={() => togglePin(cat.id)}
                                            className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-colors"
                                        >
                                            <PinOff className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Quick Filters Editor (shown when editing a pinned category) */}
                {editingFilters && (
                    <section className="bg-stone-900 rounded-xl border border-orange-500/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-orange-400">
                                Quick Filters: {categories.find(c => c.id === editingFilters)?.name}
                            </h3>
                            <button onClick={() => setEditingFilters(null)} className="p-1 hover:bg-stone-800 rounded">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-xs text-stone-400 mb-3">
                            Filters appear as buttons below the department tab (e.g., Beer → 6pk, 12pk, 24pk). Keywords match against product names.
                        </p>

                        {/* Existing Filters */}
                        <div className="space-y-2 mb-4">
                            {(config.quickFilters[editingFilters] || []).map((filter, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-stone-800 rounded-lg">
                                    <span className="font-medium text-sm flex-1">{filter.label}</span>
                                    <span className="text-xs text-stone-400">{filter.keywords.join(', ')}</span>
                                    <button
                                        onClick={() => removeQuickFilter(editingFilters, idx)}
                                        className="p-1 hover:bg-red-500/30 text-red-400 rounded"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Filter */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newFilterLabel}
                                onChange={(e) => setNewFilterLabel(e.target.value)}
                                placeholder="Label (e.g., 12pk)"
                                className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm flex-1 focus:outline-none focus:border-orange-500"
                            />
                            <input
                                type="text"
                                value={newFilterKeywords}
                                onChange={(e) => setNewFilterKeywords(e.target.value)}
                                placeholder="Keywords (comma separated)"
                                className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm flex-1 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={() => addQuickFilter(editingFilters)}
                                disabled={!newFilterLabel.trim() || !newFilterKeywords.trim()}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                            >
                                <Plus className="h-3 w-3" /> Add
                            </button>
                        </div>
                    </section>
                )}

                {/* All Categories Section */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wide">
                            All Categories ({categories.length})
                        </h2>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search categories..."
                                className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredCategories.map(cat => {
                            const isPinned = config.pinnedCategoryIds.includes(cat.id)
                            return (
                                <div
                                    key={cat.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isPinned
                                        ? 'bg-orange-500/10 border-orange-500/50'
                                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                                        }`}
                                >
                                    <span className="text-lg">{config.categoryOverrides[cat.id]?.icon || '📦'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{cat.name}</p>
                                        {cat.itemCount !== undefined && (
                                            <p className="text-[10px] text-stone-500">{cat.itemCount} items</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => togglePin(cat.id)}
                                        disabled={!isPinned && config.pinnedCategoryIds.length >= 12}
                                        className={`p-2 rounded-lg transition-colors ${isPinned
                                            ? 'bg-orange-500/30 text-orange-400 hover:bg-red-500/30 hover:text-red-400'
                                            : 'bg-stone-800 hover:bg-stone-700 text-stone-400 disabled:opacity-30'
                                            }`}
                                    >
                                        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>
        </div>
    )
}
