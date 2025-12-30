'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Trash2, Save, ToggleLeft, ToggleRight, TrendingUp, Clock, Gift, Star, Filter, ChevronDown, ChevronUp, DollarSign, Users } from 'lucide-react'

interface MarketingRule {
    id?: string
    name: string
    ruleType: string
    isActive: boolean
    // Time filters
    daysInactive: number | null
    daysInactiveMax: number | null
    // Spend filters
    minSpendTotal: number | null
    maxSpendTotal: number | null
    // Visit filters
    minVisitCount: number | null
    maxVisitCount: number | null
    // Limits
    maxSendsPerDay: number | null
    maxSendsTotal: number | null
    // Reward
    discountType: string
    discountValue: number
    validityDays: number
    // Stats
    sentCount: number
    redeemedCount: number
}

const RULE_TYPES = [
    { value: 'WIN_BACK', label: 'Win-Back (Inactive Customers)', icon: Clock, color: 'text-orange-400' },
    { value: 'VIP', label: 'VIP Reward (High Spenders)', icon: Star, color: 'text-yellow-400' },
    { value: 'NEW_CUSTOMER', label: 'Welcome (New Customers)', icon: Users, color: 'text-blue-400' },
    { value: 'CUSTOM', label: 'Custom Filter', icon: Filter, color: 'text-purple-400' }
]

export default function SmsMarketingRulesPage() {
    const [rules, setRules] = useState<MarketingRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingRule, setEditingRule] = useState<Partial<MarketingRule> | null>(null)
    const [saving, setSaving] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    useEffect(() => {
        fetchRules()
    }, [])

    const fetchRules = async () => {
        try {
            const res = await fetch('/api/sms-marketing-rules')
            if (res.ok) {
                setRules(await res.json())
            }
        } catch (error) {
            console.error('Error fetching rules:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveRule = async () => {
        if (!editingRule?.name || !editingRule?.ruleType) return
        setSaving(true)
        try {
            const res = await fetch('/api/sms-marketing-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingRule)
            })
            if (res.ok) {
                fetchRules()
                setShowForm(false)
                setEditingRule(null)
                setShowAdvanced(false)
            }
        } catch (error) {
            console.error('Error saving rule:', error)
        } finally {
            setSaving(false)
        }
    }

    const toggleRule = async (rule: MarketingRule) => {
        try {
            await fetch('/api/sms-marketing-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...rule, isActive: !rule.isActive })
            })
            fetchRules()
        } catch (error) {
            console.error('Error toggling rule:', error)
        }
    }

    const deleteRule = async (id: string) => {
        if (!confirm('Delete this rule?')) return
        try {
            await fetch(`/api/sms-marketing-rules?id=${id}`, { method: 'DELETE' })
            fetchRules()
        } catch (error) {
            console.error('Error deleting rule:', error)
        }
    }

    const getRuleIcon = (ruleType: string) => {
        const type = RULE_TYPES.find(t => t.value === ruleType)
        if (!type) return <Filter className="h-5 w-5 text-stone-400" />
        const Icon = type.icon
        return <Icon className={`h-5 w-5 ${type.color}`} />
    }

    const getFilterSummary = (rule: MarketingRule) => {
        const parts: string[] = []
        if (rule.daysInactive) {
            if (rule.daysInactiveMax) {
                parts.push(`${rule.daysInactive}-${rule.daysInactiveMax} days inactive`)
            } else {
                parts.push(`${rule.daysInactive}+ days inactive`)
            }
        }
        if (rule.minSpendTotal || rule.maxSpendTotal) {
            if (rule.minSpendTotal && rule.maxSpendTotal) {
                parts.push(`$${rule.minSpendTotal}-$${rule.maxSpendTotal} spent`)
            } else if (rule.minSpendTotal) {
                parts.push(`$${rule.minSpendTotal}+ spent`)
            } else {
                parts.push(`Under $${rule.maxSpendTotal} spent`)
            }
        }
        if (rule.minVisitCount || rule.maxVisitCount) {
            if (rule.minVisitCount && rule.maxVisitCount) {
                parts.push(`${rule.minVisitCount}-${rule.maxVisitCount} visits`)
            } else if (rule.minVisitCount) {
                parts.push(`${rule.minVisitCount}+ visits`)
            } else {
                parts.push(`Under ${rule.maxVisitCount} visits`)
            }
        }
        return parts.length > 0 ? parts.join(' • ') : 'All customers'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="text-orange-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <MessageSquare className="h-8 w-8 text-emerald-500" />
                            Automated SMS Rules
                        </h1>
                        <p className="text-stone-400 mt-2">Target specific customers from your 5000+ with smart filters</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingRule({
                                name: '',
                                ruleType: 'WIN_BACK',
                                isActive: true,
                                daysInactive: 28,
                                daysInactiveMax: null,
                                minSpendTotal: null,
                                maxSpendTotal: null,
                                minVisitCount: null,
                                maxVisitCount: null,
                                maxSendsPerDay: 50,
                                maxSendsTotal: null,
                                discountType: 'PERCENTAGE',
                                discountValue: 10,
                                validityDays: 7
                            })
                            setShowForm(true)
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Rule
                    </button>
                </div>

                {/* Info Banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                    <p className="text-emerald-300 text-sm">
                        <strong>🎯 Smart Targeting:</strong> Filter by days inactive, total spend, visit count, and more.
                        Set daily limits to control costs. Discount auto-applies at checkout!
                    </p>
                </div>

                {/* Rules List */}
                {rules.length === 0 ? (
                    <div className="glass-panel rounded-xl p-12 text-center">
                        <Filter className="h-16 w-16 mx-auto text-stone-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No rules yet</h3>
                        <p className="text-stone-400 mb-6">Create targeted SMS campaigns with smart customer filters</p>
                        <button
                            onClick={() => {
                                setEditingRule({
                                    name: 'Win-Back 10% Off',
                                    ruleType: 'WIN_BACK',
                                    isActive: true,
                                    daysInactive: 28,
                                    maxSendsPerDay: 50,
                                    discountType: 'PERCENTAGE',
                                    discountValue: 10,
                                    validityDays: 7
                                })
                                setShowForm(true)
                            }}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                        >
                            Create Win-Back Rule
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rules.map((rule) => (
                            <div key={rule.id} className="glass-panel rounded-xl p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-stone-800 rounded-lg">
                                            {getRuleIcon(rule.ruleType)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                {rule.name}
                                                {!rule.isActive && (
                                                    <span className="text-xs px-2 py-0.5 bg-stone-700 text-stone-400 rounded">Paused</span>
                                                )}
                                            </h3>
                                            <p className="text-stone-400 text-sm mt-1">
                                                <Filter className="h-3 w-3 inline mr-1" />
                                                {getFilterSummary(rule)}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-sm">
                                                <span className="text-emerald-400 font-medium">
                                                    {rule.discountType === 'PERCENTAGE' ? `${rule.discountValue}% Off` : `$${rule.discountValue} Off`}
                                                </span>
                                                <span className="text-stone-500">Valid {rule.validityDays} days</span>
                                                {rule.maxSendsPerDay && (
                                                    <span className="text-blue-400 text-xs">Max {rule.maxSendsPerDay}/day</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Stats */}
                                        <div className="text-right mr-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <TrendingUp className="h-4 w-4 text-blue-400" />
                                                <span className="text-stone-400">Sent: <span className="text-white">{rule.sentCount}</span></span>
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="text-stone-400">Redeemed: </span>
                                                <span className="text-emerald-400 font-medium">{rule.redeemedCount}</span>
                                            </div>
                                        </div>
                                        {/* Toggle */}
                                        <button onClick={() => toggleRule(rule)} className="text-stone-400 hover:text-white">
                                            {rule.isActive ? (
                                                <ToggleRight className="h-8 w-8 text-emerald-500" />
                                            ) : (
                                                <ToggleLeft className="h-8 w-8" />
                                            )}
                                        </button>
                                        {/* Delete */}
                                        <button onClick={() => deleteRule(rule.id!)} className="text-stone-500 hover:text-red-400">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Form Modal */}
                {showForm && editingRule && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
                        <div className="bg-stone-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 my-8">
                            <h3 className="text-xl font-bold text-white mb-6">
                                {editingRule.id ? 'Edit Rule' : 'Create SMS Rule'}
                            </h3>

                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div>
                                    <label className="text-sm text-stone-400 mb-1 block">Rule Name</label>
                                    <input
                                        type="text"
                                        value={editingRule.name || ''}
                                        onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white"
                                        placeholder="e.g., Win-Back 10% Off"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-stone-400 mb-1 block">Rule Type</label>
                                    <select
                                        value={editingRule.ruleType || 'WIN_BACK'}
                                        onChange={(e) => setEditingRule({ ...editingRule, ruleType: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white"
                                    >
                                        {RULE_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Customer Filters Section */}
                                <div className="border-t border-stone-700 pt-4">
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="flex items-center justify-between w-full text-left"
                                    >
                                        <span className="text-sm font-medium text-white flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-purple-400" />
                                            Customer Filters
                                        </span>
                                        {showAdvanced ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                                    </button>

                                    {showAdvanced && (
                                        <div className="mt-4 space-y-4 bg-stone-800/50 rounded-lg p-4">
                                            {/* Days Inactive Range */}
                                            <div>
                                                <label className="text-xs text-stone-400 mb-2 block flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> Days Since Last Visit
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="number"
                                                        value={editingRule.daysInactive || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, daysInactive: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Min (e.g., 28)"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingRule.daysInactiveMax || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, daysInactiveMax: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Max (optional)"
                                                    />
                                                </div>
                                                <p className="text-xs text-stone-500 mt-1">e.g., 28-60 = only customers inactive 28-60 days</p>
                                            </div>

                                            {/* Spend Range */}
                                            <div>
                                                <label className="text-xs text-stone-400 mb-2 block flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" /> Total Lifetime Spend ($)
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="number"
                                                        value={editingRule.minSpendTotal || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, minSpendTotal: e.target.value ? parseFloat(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Min (e.g., 100)"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingRule.maxSpendTotal || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, maxSpendTotal: e.target.value ? parseFloat(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Max (optional)"
                                                    />
                                                </div>
                                            </div>

                                            {/* Visit Count Range */}
                                            <div>
                                                <label className="text-xs text-stone-400 mb-2 block flex items-center gap-1">
                                                    <Users className="h-3 w-3" /> Number of Visits
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="number"
                                                        value={editingRule.minVisitCount || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, minVisitCount: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Min visits"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingRule.maxVisitCount || ''}
                                                        onChange={(e) => setEditingRule({ ...editingRule, maxVisitCount: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                        placeholder="Max visits"
                                                    />
                                                </div>
                                                <p className="text-xs text-stone-500 mt-1">e.g., 1-3 = customers with 1-3 visits only</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reward Settings */}
                                <div className="border-t border-stone-700 pt-4">
                                    <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <Gift className="h-4 w-4 text-pink-400" />
                                        Reward
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-stone-400 mb-1 block">Discount Type</label>
                                            <select
                                                value={editingRule.discountType || 'PERCENTAGE'}
                                                onChange={(e) => setEditingRule({ ...editingRule, discountType: e.target.value })}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                            >
                                                <option value="PERCENTAGE">Percentage (%)</option>
                                                <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-stone-400 mb-1 block">Value</label>
                                            <input
                                                type="number"
                                                value={editingRule.discountValue || 10}
                                                onChange={(e) => setEditingRule({ ...editingRule, discountValue: parseInt(e.target.value) })}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className="text-xs text-stone-400 mb-1 block">Valid For (Days)</label>
                                        <input
                                            type="number"
                                            value={editingRule.validityDays || 7}
                                            onChange={(e) => setEditingRule({ ...editingRule, validityDays: parseInt(e.target.value) })}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Limits */}
                                <div className="border-t border-stone-700 pt-4">
                                    <p className="text-sm font-medium text-white mb-3">📊 Daily Limits (Cost Control)</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-stone-400 mb-1 block">Max SMS per Day</label>
                                            <input
                                                type="number"
                                                value={editingRule.maxSendsPerDay || ''}
                                                onChange={(e) => setEditingRule({ ...editingRule, maxSendsPerDay: e.target.value ? parseInt(e.target.value) : null })}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                placeholder="e.g., 50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-stone-400 mb-1 block">Total Limit</label>
                                            <input
                                                type="number"
                                                value={editingRule.maxSendsTotal || ''}
                                                onChange={(e) => setEditingRule({ ...editingRule, maxSendsTotal: e.target.value ? parseInt(e.target.value) : null })}
                                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm"
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-stone-500 mt-1">Limit daily sends to control SMS costs</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setShowForm(false); setEditingRule(null); setShowAdvanced(false) }}
                                    className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-lg font-medium hover:bg-stone-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveRule}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="h-5 w-5" />
                                    {saving ? 'Saving...' : 'Save Rule'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

