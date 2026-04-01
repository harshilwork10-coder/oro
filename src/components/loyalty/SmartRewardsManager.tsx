'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, Tag, Package, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'

interface LoyaltyRule {
    id: string
    name: string
    type: string
    isActive: boolean
    category: string | null
    upc: string | null
    earnMode: string
    pointsPerDollar: number | null
    fixedPointsPerUnit: number | null
    multiplier: number | null
    priority: number
}

interface SmartRewardsManagerProps {
    programId: string
    useSmartRewards: boolean
    onToggleSmartRewards: (enabled: boolean) => void
}

const TYPE_COLORS: Record<string, string> = {
    EXCLUSION: 'bg-red-500/20 text-red-400 border-red-500/30',
    CATEGORY: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    PRODUCT: 'bg-green-500/20 text-green-400 border-green-500/30',
    GLOBAL: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
}

const TYPE_ICONS: Record<string, typeof Shield> = {
    EXCLUSION: Shield,
    CATEGORY: Tag,
    PRODUCT: Package,
}

// Available categories from MasterUpcProduct
const CATEGORIES = [
    'Beer', 'Spirits', 'Wine', 'Alcohol - Other',
    'Snacks', 'Beverages', 'Frozen Beverages', 'Juice & Smoothies',
    'General Merchandise', 'Grocery', 'Health & Beauty', 'Health & Wellness',
    'Mixers', 'Non-Alcoholic Beverages', 'Pantry', 'Cigars',
    'Produce', 'Tobacco', 'Vape'
]

export default function SmartRewardsManager({ programId, useSmartRewards, onToggleSmartRewards }: SmartRewardsManagerProps) {
    const [rules, setRules] = useState<LoyaltyRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [saving, setSaving] = useState(false)
    const [expanded, setExpanded] = useState(true)

    // New rule form
    const [newRule, setNewRule] = useState({
        name: '',
        type: 'EXCLUSION',
        category: '',
        upc: '',
        earnMode: 'PER_DOLLAR',
        pointsPerDollar: '0',
        fixedPointsPerUnit: '0',
        multiplier: '1',
    })

    const fetchRules = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/loyalty/rules?programId=${programId}`)
            if (res.ok) {
                const data = await res.json()
                setRules(data.rules || [])
            }
        } catch (err) {
            console.error('Failed to fetch rules:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (programId) fetchRules()
    }, [programId])

    const addRule = async () => {
        if (!newRule.name || (!newRule.category && newRule.type !== 'GLOBAL')) return
        setSaving(true)
        try {
            const priority = newRule.type === 'EXCLUSION' ? 100 : newRule.type === 'PRODUCT' ? 200 : newRule.type === 'CATEGORY' ? 300 : 500
            const res = await fetch('/api/loyalty/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programId,
                    ...newRule,
                    pointsPerDollar: parseFloat(newRule.pointsPerDollar) || null,
                    fixedPointsPerUnit: parseInt(newRule.fixedPointsPerUnit) || null,
                    multiplier: parseFloat(newRule.multiplier) || null,
                    priority,
                    category: newRule.category || null,
                    upc: newRule.upc || null,
                })
            })
            if (res.ok) {
                setShowAdd(false)
                setNewRule({ name: '', type: 'EXCLUSION', category: '', upc: '', earnMode: 'PER_DOLLAR', pointsPerDollar: '0', fixedPointsPerUnit: '0', multiplier: '1' })
                fetchRules()
            }
        } catch (err) {
            console.error('Failed to add rule:', err)
        } finally {
            setSaving(false)
        }
    }

    const deleteRule = async (id: string) => {
        if (!confirm('Delete this rule?')) return
        try {
            await fetch(`/api/loyalty/rules?id=${id}`, { method: 'DELETE' })
            fetchRules()
        } catch (err) {
            console.error('Failed to delete rule:', err)
        }
    }

    const toggleRule = async (id: string, isActive: boolean) => {
        try {
            await fetch('/api/loyalty/rules', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive })
            })
            fetchRules()
        } catch (err) {
            console.error('Failed to toggle rule:', err)
        }
    }

    const ruleDescription = (rule: LoyaltyRule) => {
        if (rule.type === 'EXCLUSION') return '⊘ 0 pts (excluded)'
        if (rule.earnMode === 'PER_DOLLAR') return `${rule.pointsPerDollar} pts/$1`
        if (rule.earnMode === 'PER_UNIT') return `${rule.fixedPointsPerUnit} pts/item`
        if (rule.earnMode === 'MULTIPLIER') return `${rule.multiplier}x base rate`
        return ''
    }

    return (
        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
            {/* Header */}
            <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-stone-800/50"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-amber-400" />
                    <h3 className="font-bold text-lg">Smart Rewards Rules</h3>
                    <span className="text-xs bg-stone-800 px-2 py-1 rounded-full text-stone-400">
                        {rules.length} rules
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Smart Rewards Toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSmartRewards(!useSmartRewards) }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            useSmartRewards
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-stone-800 text-stone-500 border border-stone-700'
                        }`}
                    >
                        {useSmartRewards ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        {useSmartRewards ? 'Active' : 'Off'}
                    </button>
                    {expanded ? <ChevronUp className="h-5 w-5 text-stone-500" /> : <ChevronDown className="h-5 w-5 text-stone-500" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-stone-700">
                    {/* Built-in exclusions info */}
                    <div className="px-5 py-3 bg-red-500/5 border-b border-stone-700">
                        <p className="text-xs text-stone-500">
                            <strong className="text-red-400">Built-in exclusions</strong> (always active): Tobacco • Lottery • Gift Cards
                        </p>
                    </div>

                    {/* Rules list */}
                    {loading ? (
                        <div className="p-8 text-center text-stone-500">Loading rules...</div>
                    ) : rules.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">
                            <p>No custom rules yet.</p>
                            <p className="text-xs mt-1">Default: {useSmartRewards ? 'Using global rate as fallback' : 'Flat rate (1 pt/$1)'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-800">
                            {rules.map(rule => {
                                const Icon = TYPE_ICONS[rule.type] || Tag
                                return (
                                    <div key={rule.id} className={`px-5 py-3 flex items-center justify-between ${!rule.isActive ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${TYPE_COLORS[rule.type] || TYPE_COLORS.GLOBAL}`}>
                                                {rule.type}
                                            </span>
                                            <Icon className="h-4 w-4 text-stone-400" />
                                            <div>
                                                <p className="font-medium text-sm">{rule.name}</p>
                                                <p className="text-xs text-stone-500">
                                                    {rule.category && `Category: ${rule.category}`}
                                                    {rule.upc && `UPC: ${rule.upc}`}
                                                    {' → '}{ruleDescription(rule)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleRule(rule.id, rule.isActive)}
                                                className="p-1.5 hover:bg-stone-800 rounded-lg"
                                                title={rule.isActive ? 'Disable' : 'Enable'}
                                            >
                                                {rule.isActive
                                                    ? <ToggleRight className="h-4 w-4 text-green-400" />
                                                    : <ToggleLeft className="h-4 w-4 text-stone-600" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => deleteRule(rule.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-stone-500 hover:text-red-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Add Rule */}
                    <div className="p-4 border-t border-stone-700">
                        {showAdd ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-stone-400">Rule Name</label>
                                        <input
                                            value={newRule.name}
                                            onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                            placeholder="e.g. Beer Bonus"
                                            className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400">Rule Type</label>
                                        <select
                                            value={newRule.type}
                                            onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                                            className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="EXCLUSION">🔴 Exclusion (0 pts)</option>
                                            <option value="CATEGORY">🟡 Category Rate</option>
                                            <option value="PRODUCT">🟢 Product Override</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-stone-400">Category</label>
                                        <select
                                            value={newRule.category}
                                            onChange={e => setNewRule({ ...newRule, category: e.target.value })}
                                            className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">Select category...</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    {newRule.type === 'PRODUCT' && (
                                        <div>
                                            <label className="text-xs text-stone-400">UPC (optional)</label>
                                            <input
                                                value={newRule.upc}
                                                onChange={e => setNewRule({ ...newRule, upc: e.target.value })}
                                                placeholder="e.g. 0123456789"
                                                className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                {newRule.type !== 'EXCLUSION' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-stone-400">Earn Mode</label>
                                            <select
                                                value={newRule.earnMode}
                                                onChange={e => setNewRule({ ...newRule, earnMode: e.target.value })}
                                                className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                            >
                                                <option value="PER_DOLLAR">Points per Dollar</option>
                                                <option value="PER_UNIT">Fixed Points per Item</option>
                                                <option value="MULTIPLIER">Multiplier (x base)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-stone-400">
                                                {newRule.earnMode === 'PER_DOLLAR' ? 'Points per $1' :
                                                 newRule.earnMode === 'PER_UNIT' ? 'Points per Item' : 'Multiplier'}
                                            </label>
                                            <input
                                                type="number"
                                                step={newRule.earnMode === 'PER_UNIT' ? '1' : '0.1'}
                                                value={newRule.earnMode === 'PER_DOLLAR' ? newRule.pointsPerDollar :
                                                       newRule.earnMode === 'PER_UNIT' ? newRule.fixedPointsPerUnit : newRule.multiplier}
                                                onChange={e => {
                                                    const val = e.target.value
                                                    if (newRule.earnMode === 'PER_DOLLAR') setNewRule({ ...newRule, pointsPerDollar: val })
                                                    else if (newRule.earnMode === 'PER_UNIT') setNewRule({ ...newRule, fixedPointsPerUnit: val })
                                                    else setNewRule({ ...newRule, multiplier: val })
                                                }}
                                                className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-stone-800 rounded-lg text-sm">Cancel</button>
                                    <button onClick={addRule} disabled={saving} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium disabled:opacity-50">
                                        {saving ? 'Adding...' : 'Add Rule'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAdd(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-sm text-stone-400 hover:text-white transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add Earn Rule
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
