'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft, ChevronRight, Plus, Trash2, Save,
    CheckCircle2, AlertCircle, Settings2, Layers, ArrowRightLeft, X,
    Edit2, Check
} from 'lucide-react'

// ============ TYPES ============

interface TaxJurisdiction {
    id: string
    name: string
    type: string
    salesTaxRate: number
    effectiveFrom: string
    isActive: boolean
    priority: number
}

interface TaxGroupComponent {
    id: string
    jurisdictionId: string
    compoundOrder: number
    jurisdiction: TaxJurisdiction
}

interface TaxGroup {
    id: string
    name: string
    isDefault: boolean
    components: TaxGroupComponent[]
    _count: { departmentDefaults: number }
}

interface Category {
    id: string
    name: string
    departmentId?: string
}

interface DeptDefault {
    id: string
    categoryId: string
    taxGroupId: string
    category: { id: string; name: string }
    taxGroup: { id: string; name: string; isDefault: boolean }
}

// ============ MAIN COMPONENT ============

export default function TaxSetupPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const user = session?.user as any

    // SECURITY: Provider-only page — redirect unauthorized roles
    useEffect(() => {
        if (status === 'loading') return
        if (!user || !['PROVIDER', 'ADMIN'].includes(user.role)) {
            router.replace('/dashboard/settings')
        }
    }, [status, user, router])

    // Wizard step: 0=Components, 1=Groups, 2=Mapping
    const [step, setStep] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Data
    const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([])
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [deptDefaults, setDeptDefaults] = useState<DeptDefault[]>([])

    // Step A: New Component Form
    const [newCompName, setNewCompName] = useState('')
    const [newCompType, setNewCompType] = useState('STATE')
    const [newCompRate, setNewCompRate] = useState('')
    const [showNewComp, setShowNewComp] = useState(false)

    // Step B: New Group Form
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupDefault, setNewGroupDefault] = useState(false)
    const [newGroupComponentIds, setNewGroupComponentIds] = useState<string[]>([])
    const [showNewGroup, setShowNewGroup] = useState(false)
    const [editingGroup, setEditingGroup] = useState<string | null>(null)
    const [editGroupComponentIds, setEditGroupComponentIds] = useState<string[]>([])

    // Step C: Department Mappings
    const [mappingChanges, setMappingChanges] = useState<Record<string, string>>({})

    // FIX 7: Split canEdit — owner can VIEW and adjust Dept→Group MAPPING only
    // Destructive actions (create/delete tax components, create/delete groups) require PROVIDER/FRANCHISOR
    const canEdit = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user?.role)
    const canDestructiveEdit = ['PROVIDER', 'FRANCHISOR'].includes(user?.role)

    // ============ DATA FETCHING ============

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [jurRes, groupRes, catRes, defaultsRes] = await Promise.all([
                fetch('/api/tax/jurisdictions'),
                fetch('/api/tax/groups'),
                fetch('/api/inventory/categories'),
                fetch('/api/tax/department-defaults')
            ])

            const jurData = await jurRes.json()
            const groupData = await groupRes.json()
            const catData = await catRes.json()
            const defaultsData = await defaultsRes.json()

            setJurisdictions(jurData.jurisdictions || [])
            setTaxGroups(groupData.taxGroups || [])
            setCategories(catData.categories || catData || [])
            setDeptDefaults(defaultsData.defaults || [])
        } catch (err) {
            console.error('Failed to fetch tax data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // ============ STEP A: TAX COMPONENTS ============

    const handleCreateComponent = async () => {
        if (!newCompName.trim() || !newCompRate) return
        setSaving(true)
        try {
            const res = await fetch('/api/tax/jurisdictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCompName.trim(),
                    type: newCompType,
                    salesTaxRate: parseFloat(newCompRate),
                    priority: jurisdictions.length
                })
            })
            if (!res.ok) throw new Error('Failed to create')
            showToast(`Created ${newCompName}`, 'success')
            setNewCompName('')
            setNewCompRate('')
            setShowNewComp(false)
            await fetchAll()
        } catch {
            showToast('Failed to create tax component', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ============ STEP B: TAX GROUPS ============

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return
        setSaving(true)
        try {
            const res = await fetch('/api/tax/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newGroupName.trim(),
                    isDefault: newGroupDefault,
                    componentIds: newGroupComponentIds.map(id => ({ jurisdictionId: id }))
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed')
            }
            showToast(`Created ${newGroupName}`, 'success')
            setNewGroupName('')
            setNewGroupDefault(false)
            setNewGroupComponentIds([])
            setShowNewGroup(false)
            await fetchAll()
        } catch (err: any) {
            showToast(err.message || 'Failed to create tax group', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateGroupComponents = async (groupId: string) => {
        setSaving(true)
        try {
            await fetch('/api/tax/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: groupId,
                    componentIds: editGroupComponentIds.map(id => ({ jurisdictionId: id }))
                })
            })
            showToast('Updated tax group', 'success')
            setEditingGroup(null)
            await fetchAll()
        } catch {
            showToast('Failed to update tax group', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Delete this tax group? Departments using it will lose their tax assignment.')) return
        setSaving(true)
        try {
            await fetch(`/api/tax/groups?id=${id}`, { method: 'DELETE' })
            showToast('Deleted tax group', 'success')
            await fetchAll()
        } catch {
            showToast('Failed to delete', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleSetDefault = async (id: string) => {
        setSaving(true)
        try {
            await fetch('/api/tax/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isDefault: true })
            })
            showToast('Set as default', 'success')
            await fetchAll()
        } catch {
            showToast('Failed', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ============ STEP C: DEPARTMENT MAPPINGS ============

    const handleSaveMappings = async () => {
        const entries = Object.entries(mappingChanges)
        if (entries.length === 0) {
            showToast('No changes to save', 'error')
            return
        }
        setSaving(true)
        try {
            const mappings = entries.map(([categoryId, taxGroupId]) => ({
                categoryId,
                taxGroupId
            }))
            const res = await fetch('/api/tax/department-defaults', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappings })
            })
            if (!res.ok) throw new Error('Failed')
            showToast(`Saved ${entries.length} department mapping(s)`, 'success')
            setMappingChanges({})
            await fetchAll()
        } catch {
            showToast('Failed to save mappings', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Get the current tax group for a category (from saved defaults or pending changes)
    const getCategoryTaxGroup = (categoryId: string): string => {
        if (mappingChanges[categoryId]) return mappingChanges[categoryId]
        const def = deptDefaults.find(d => d.categoryId === categoryId)
        return def?.taxGroupId || ''
    }

    // ============ COMPUTED ============

    const totalRate = (components: TaxGroupComponent[]) => {
        return components.reduce((sum, c) => sum + Number(c.jurisdiction.salesTaxRate), 0)
    }

    const steps = [
        { label: 'Tax Components', icon: Settings2, desc: 'State, County, City, Special taxes' },
        { label: 'Tax Groups', icon: Layers, desc: 'Bundle components into named groups' },
        { label: 'Department Mapping', icon: ArrowRightLeft, desc: 'Assign each department a tax group' }
    ]

    // ============ RENDER ============

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100">
            {/* Header */}
            <div className="border-b border-stone-800 bg-stone-900/50">
                <div className="max-w-5xl mx-auto px-6 py-5">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Settings2 className="h-7 w-7 text-amber-500" />
                        Tax Setup Wizard
                    </h1>
                    <p className="text-stone-400 mt-1">Configure tax components, groups, and department mappings for this location</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="max-w-5xl mx-auto px-6 py-4">
                <div className="flex items-center gap-2">
                    {steps.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${step === i
                                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                                    : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === i ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-400'
                                }`}>
                                {i + 1}
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm">{s.label}</div>
                                <div className="text-xs text-stone-500">{s.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 pb-8">

                {/* ====== STEP A: Tax Components ====== */}
                {step === 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Tax Components (up to 6)</h2>
                            {/* FIX 7: Add Component only for PROVIDER/FRANCHISOR */}
                            {canDestructiveEdit && jurisdictions.length < 6 && (
                                <button
                                    onClick={() => setShowNewComp(!showNewComp)}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium text-sm transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Add Component
                                </button>
                            )}
                        </div>

                        {/* New Component Form */}
                        {showNewComp && (
                            <div className="bg-stone-900 border border-stone-700 rounded-xl p-5 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-stone-400 mb-1 block">Name</label>
                                        <input
                                            value={newCompName}
                                            onChange={e => setNewCompName(e.target.value)}
                                            placeholder="State Sales Tax"
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-stone-400 mb-1 block">Type</label>
                                        <select
                                            value={newCompType}
                                            onChange={e => setNewCompType(e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="STATE">State</option>
                                            <option value="COUNTY">County</option>
                                            <option value="CITY">City</option>
                                            <option value="DISTRICT">Special District</option>
                                            <option value="EXCISE">Excise / Surcharge</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-stone-400 mb-1 block">Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            value={newCompRate}
                                            onChange={e => setNewCompRate(e.target.value)}
                                            placeholder="6.25"
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateComponent}
                                        disabled={saving || !newCompName.trim() || !newCompRate}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="h-4 w-4 inline mr-1" /> Create
                                    </button>
                                    <button
                                        onClick={() => setShowNewComp(false)}
                                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Components List */}
                        <div className="space-y-2">
                            {jurisdictions.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No tax components yet. Add your first one!</p>
                                </div>
                            ) : (
                                jurisdictions.map(j => (
                                    <div key={j.id} className="flex items-center justify-between px-5 py-4 bg-stone-900/80 border border-stone-800 rounded-xl hover:border-stone-700 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${j.type === 'STATE' ? 'bg-blue-500/20 text-blue-400' :
                                                    j.type === 'COUNTY' ? 'bg-purple-500/20 text-purple-400' :
                                                        j.type === 'CITY' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            j.type === 'EXCISE' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-stone-700 text-stone-300'
                                                }`}>
                                                {j.type}
                                            </div>
                                            <div>
                                                <span className="font-medium">{j.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-bold text-amber-400">
                                                {Number(j.salesTaxRate).toFixed(4)}%
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${j.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {j.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {jurisdictions.length >= 6 && (
                            <p className="text-amber-400 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> Maximum 6 tax components reached
                            </p>
                        )}
                    </div>
                )}

                {/* ====== STEP B: Tax Groups ====== */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Tax Groups</h2>
                            {/* FIX 7: New Group only for PROVIDER/FRANCHISOR */}
                            {canDestructiveEdit && (
                                <button
                                    onClick={() => setShowNewGroup(!showNewGroup)}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium text-sm transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> New Group
                                </button>
                            )}
                        </div>

                        <p className="text-stone-400 text-sm">
                            Each group bundles tax components. Example: <strong className="text-stone-200">ALCOHOL</strong> = State Sales + County + City + Liquor Surcharge
                        </p>

                        {/* New Group Form */}
                        {showNewGroup && (
                            <div className="bg-stone-900 border border-stone-700 rounded-xl p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-stone-400 mb-1 block">Group Name</label>
                                        <input
                                            value={newGroupName}
                                            onChange={e => setNewGroupName(e.target.value)}
                                            placeholder="ALCOHOL"
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm uppercase focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newGroupDefault}
                                                onChange={e => setNewGroupDefault(e.target.checked)}
                                                className="rounded border-stone-600 bg-stone-800 text-amber-500"
                                            />
                                            <span className="text-sm text-stone-300">Set as default group</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-stone-400 mb-2 block">Select Components</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {jurisdictions.map(j => (
                                            <label key={j.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${newGroupComponentIds.includes(j.id)
                                                    ? 'bg-amber-500/10 border-amber-500/50'
                                                    : 'bg-stone-800/50 border-stone-700 hover:border-stone-600'
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    checked={newGroupComponentIds.includes(j.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setNewGroupComponentIds([...newGroupComponentIds, j.id])
                                                        } else {
                                                            setNewGroupComponentIds(newGroupComponentIds.filter(id => id !== j.id))
                                                        }
                                                    }}
                                                    className="rounded border-stone-600 bg-stone-800 text-amber-500"
                                                />
                                                <span className="text-sm">{j.name}</span>
                                                <span className="text-amber-400 text-sm ml-auto font-mono">{Number(j.salesTaxRate).toFixed(2)}%</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={saving || !newGroupName.trim()}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="h-4 w-4 inline mr-1" /> Create Group
                                    </button>
                                    <button
                                        onClick={() => { setShowNewGroup(false); setNewGroupComponentIds([]) }}
                                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Groups List */}
                        <div className="space-y-3">
                            {taxGroups.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No tax groups yet. Create GENERAL, ALCOHOL, TOBACCO, etc.</p>
                                </div>
                            ) : (
                                taxGroups.map(g => (
                                    <div key={g.id} className="bg-stone-900/80 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-colors">
                                        <div className="flex items-center justify-between px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold">{g.name}</span>
                                                {g.isDefault && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">DEFAULT</span>
                                                )}
                                                <span className="text-xs text-stone-500">
                                                    {g._count.departmentDefaults} dept(s) using
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-amber-400">
                                                    {totalRate(g.components).toFixed(2)}%
                                                </span>
                                                {/* FIX 7: Edit/Delete/SetDefault only for PROVIDER/FRANCHISOR */}
                                                {canDestructiveEdit && (
                                                    <div className="flex gap-1">
                                                        {!g.isDefault && (
                                                            <button
                                                                onClick={() => handleSetDefault(g.id)}
                                                                className="p-1.5 text-stone-400 hover:text-amber-400 transition-colors"
                                                                title="Set as default"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (editingGroup === g.id) {
                                                                    setEditingGroup(null)
                                                                } else {
                                                                    setEditingGroup(g.id)
                                                                    setEditGroupComponentIds(g.components.map(c => c.jurisdictionId))
                                                                }
                                                            }}
                                                            className="p-1.5 text-stone-400 hover:text-blue-400 transition-colors"
                                                            title="Edit components"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteGroup(g.id)}
                                                            className="p-1.5 text-stone-400 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Component chips */}
                                        <div className="px-5 pb-4 flex flex-wrap gap-2">
                                            {g.components.map(c => (
                                                <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                                                    {c.jurisdiction.name} <span className="text-amber-400 font-mono">{Number(c.jurisdiction.salesTaxRate).toFixed(2)}%</span>
                                                </span>
                                            ))}
                                            {g.components.length === 0 && (
                                                <span className="text-xs text-stone-500 italic">No components assigned</span>
                                            )}
                                        </div>

                                        {/* Edit Components Inline */}
                                        {editingGroup === g.id && (
                                            <div className="px-5 pb-4 border-t border-stone-800 pt-4">
                                                <p className="text-xs text-stone-400 mb-2">Select components for this group:</p>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    {jurisdictions.map(j => (
                                                        <label key={j.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${editGroupComponentIds.includes(j.id)
                                                                ? 'bg-amber-500/10 border-amber-500/50'
                                                                : 'bg-stone-800/50 border-stone-700'
                                                            }`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={editGroupComponentIds.includes(j.id)}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setEditGroupComponentIds([...editGroupComponentIds, j.id])
                                                                    } else {
                                                                        setEditGroupComponentIds(editGroupComponentIds.filter(id => id !== j.id))
                                                                    }
                                                                }}
                                                                className="rounded border-stone-600 bg-stone-800 text-amber-500"
                                                            />
                                                            <span>{j.name}</span>
                                                            <span className="text-amber-400 font-mono ml-auto">{Number(j.salesTaxRate).toFixed(2)}%</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateGroupComponents(g.id)}
                                                        disabled={saving}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                                    >
                                                        <Check className="h-3 w-3 inline mr-1" /> Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGroup(null)}
                                                        className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm transition-colors"
                                                    >
                                                        <X className="h-3 w-3 inline mr-1" /> Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ====== STEP C: Department Mapping ====== */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Department → Tax Group Mapping</h2>
                                <p className="text-sm text-stone-400">Assign each department a tax group. All products in that department inherit the tax automatically.</p>
                            </div>
                            {canEdit && Object.keys(mappingChanges).length > 0 && (
                                <button
                                    onClick={handleSaveMappings}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                                >
                                    <Save className="h-4 w-4" /> Save {Object.keys(mappingChanges).length} Change(s)
                                </button>
                            )}
                        </div>

                        {taxGroups.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>Create tax groups first (Step 2) before mapping departments.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {/* Header */}
                                <div className="grid grid-cols-12 gap-4 px-5 py-2 text-xs font-medium text-stone-500 uppercase">
                                    <div className="col-span-5">Department</div>
                                    <div className="col-span-4">Tax Group</div>
                                    <div className="col-span-3 text-right">Effective Rate</div>
                                </div>

                                {categories.map(cat => {
                                    const selectedGroupId = getCategoryTaxGroup(cat.id)
                                    const selectedGroup = taxGroups.find(g => g.id === selectedGroupId)
                                    const hasChange = mappingChanges[cat.id] !== undefined

                                    return (
                                        <div
                                            key={cat.id}
                                            className={`grid grid-cols-12 gap-4 px-5 py-3 rounded-lg transition-colors ${hasChange ? 'bg-amber-500/5 border border-amber-500/30' : 'bg-stone-900/50 border border-transparent hover:bg-stone-900/80'
                                                }`}
                                        >
                                            <div className="col-span-5 flex items-center gap-2">
                                                <span className="font-medium">{cat.name}</span>
                                                {hasChange && <span className="text-xs text-amber-400">• changed</span>}
                                            </div>
                                            <div className="col-span-4">
                                                <select
                                                    value={selectedGroupId}
                                                    onChange={e => {
                                                        const val = e.target.value
                                                        const existingDefault = deptDefaults.find(d => d.categoryId === cat.id)
                                                        if (existingDefault && existingDefault.taxGroupId === val) {
                                                            // Undo change — back to original
                                                            const copy = { ...mappingChanges }
                                                            delete copy[cat.id]
                                                            setMappingChanges(copy)
                                                        } else {
                                                            setMappingChanges({ ...mappingChanges, [cat.id]: val })
                                                        }
                                                    }}
                                                    disabled={!canEdit}
                                                    className="w-full px-3 py-1.5 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                                                >
                                                    <option value="">— Not Assigned —</option>
                                                    {taxGroups.map(g => (
                                                        <option key={g.id} value={g.id}>
                                                            {g.name} {g.isDefault ? '(default)' : ''} — {totalRate(g.components).toFixed(2)}%
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-3 flex items-center justify-end">
                                                {selectedGroup ? (
                                                    <span className="text-lg font-bold text-amber-400">
                                                        {totalRate(selectedGroup.components).toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-600 text-sm">—</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-800">
                    <button
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <div className="text-stone-500 text-sm">
                        Step {step + 1} of {steps.length}
                    </div>
                    <button
                        onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                        disabled={step === steps.length - 1}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium text-sm disabled:opacity-30 transition-colors"
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    )
}
