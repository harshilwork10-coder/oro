'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Plus, Save, Trash2, ChevronLeft, ChevronRight, Settings2,
    DollarSign, Layers, ArrowRightLeft, CheckCircle2, AlertCircle,
    Zap, X
} from 'lucide-react'
import { calculatePrice, type PricingRuleConfig, type RoundingMethod } from '@/lib/pricing-engine'

// ============ TYPES ============

interface PricingRule {
    id: string
    name: string
    label: string
    method: string
    config: PricingRuleConfig
    _count: { categoryRules: number }
}

interface Category {
    id: string
    name: string
}

interface CatMapping {
    id: string
    categoryId: string
    pricingRuleId: string
    category: { id: string; name: string }
    pricingRule: { id: string; name: string; label: string }
}

// ============ MAIN COMPONENT ============

export default function PricingRulesPage() {
    const { data: session, status } = useSession()
    const user = session?.user as any
    // SECURITY: Provider-only page — redirect unauthorized roles
    const __router = useRouter()
    useEffect(() => {
        if (status === 'loading') return
        if (!user || !['PROVIDER', 'ADMIN'].includes(user.role)) {
            __router.replace('/dashboard/settings')
        }
    }, [status, user, __router])

    const [step, setStep] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const [rules, setRules] = useState<PricingRule[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [catMappings, setCatMappings] = useState<CatMapping[]>([])

    // Step B: mapping changes
    const [mappingChanges, setMappingChanges] = useState<Record<string, string>>({})

    // Preview
    const [previewCost, setPreviewCost] = useState('10.00')
    const [previewRule, setPreviewRule] = useState<string>('')

    // FIX 7: Split canEdit — owner can view/map but NOT create/destroy rules
    const canEdit = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user?.role)
    const canDestructiveEdit = ['PROVIDER', 'FRANCHISOR'].includes(user?.role)

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // ============ FETCH ============

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [rulesRes, catRes, mappingRes] = await Promise.all([
                fetch('/api/pricing/rules'),
                fetch('/api/inventory/categories'),
                fetch('/api/pricing/category-rules')
            ])
            const rulesData = await rulesRes.json()
            const catData = await catRes.json()
            const mappingData = await mappingRes.json()

            setRules(rulesData.rules || [])
            setCategories(catData.categories || catData || [])
            setCatMappings(mappingData.mappings || [])
        } catch (err) {
            console.error('Failed to fetch:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    // ============ SEED DEFAULTS ============

    const handleSeedDefaults = async () => {
        if (!confirm('This will create 9 default pricing rules (Beer, Spirits, Wine, Snacks, Tobacco, etc). Continue?')) return
        setSaving(true)
        try {
            const res = await fetch('/api/pricing/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SEED_DEFAULTS' })
            })
            const data = await res.json()
            showToast(`Seeded ${data.seeded} default rules`, 'success')
            await fetchAll()
        } catch {
            showToast('Failed to seed defaults', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ============ DELETE RULE ============

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Delete this pricing rule? Categories using it will lose their auto-pricing.')) return
        setSaving(true)
        try {
            await fetch(`/api/pricing/rules?id=${id}`, { method: 'DELETE' })
            showToast('Deleted', 'success')
            await fetchAll()
        } catch {
            showToast('Failed to delete', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ============ SAVE MAPPINGS ============

    const handleSaveMappings = async () => {
        const entries = Object.entries(mappingChanges)
        if (entries.length === 0) { showToast('No changes', 'error'); return }
        setSaving(true)
        try {
            await fetch('/api/pricing/category-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mappings: entries.map(([categoryId, pricingRuleId]) => ({ categoryId, pricingRuleId }))
                })
            })
            showToast(`Saved ${entries.length} mapping(s)`, 'success')
            setMappingChanges({})
            await fetchAll()
        } catch {
            showToast('Failed to save', 'error')
        } finally {
            setSaving(false)
        }
    }

    const getCatRule = (catId: string) => {
        if (mappingChanges[catId]) return mappingChanges[catId]
        const m = catMappings.find(m => m.categoryId === catId)
        return m?.pricingRuleId || ''
    }

    // ============ PREVIEW ============

    const previewResult = (() => {
        if (!previewRule || !previewCost) return null
        const rule = rules.find(r => r.id === previewRule)
        if (!rule) return null
        const cost = parseFloat(previewCost)
        if (isNaN(cost) || cost <= 0) return null
        return calculatePrice(cost, rule.config)
    })()

    // ============ RENDER HELPERS ============

    const roundingNames: Record<string, string> = {
        UP_TO_99: '→ $X.99',
        UP_TO_49: '→ $X.49',
        NEAREST_05: '→ nearest $0.05',
        NEAREST_01: '→ nearest $0.01',
        NO_ROUND: 'No rounding'
    }

    const formatPct = (v: number) => `${(v * 100).toFixed(0)}%`

    const steps = [
        { label: 'Pricing Rules', icon: DollarSign, desc: 'Define markup, rounding, and tiers per department' },
        { label: 'Category Mapping', icon: ArrowRightLeft, desc: 'Assign departments to pricing rules' },
        { label: 'Preview', icon: Zap, desc: 'Test cost → sell price calculation' }
    ]

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
                        <DollarSign className="h-7 w-7 text-green-500" />
                        Department Pricing Rules
                    </h1>
                    <p className="text-stone-400 mt-1">Auto-calculate sell prices from cost. Set once per department, shared across all terminals.</p>
                </div>
            </div>

            {/* Steps */}
            <div className="max-w-5xl mx-auto px-6 py-4">
                <div className="flex items-center gap-2">
                    {steps.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${step === i
                                    ? 'bg-green-500/15 border-green-500/50 text-green-400'
                                    : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === i ? 'bg-green-500 text-black' : 'bg-stone-800 text-stone-400'
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

            <div className="max-w-5xl mx-auto px-6 pb-8">

                {/* ====== STEP 1: Pricing Rules ====== */}
                {step === 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Pricing Rules ({rules.length})</h2>
                            {/* FIX 7: Seed Defaults only for PROVIDER/FRANCHISOR */}
                            {canDestructiveEdit && rules.length === 0 && (
                                <button
                                    onClick={handleSeedDefaults}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-black rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                                >
                                    <Zap className="h-4 w-4" /> Seed 9 Default Rules
                                </button>
                            )}
                        </div>

                        {rules.length === 0 ? (
                            <div className="text-center py-16 text-stone-500">
                                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="mb-4">No pricing rules yet.</p>
                                <p className="text-sm">Click <strong>"Seed 9 Default Rules"</strong> to create c-store/liquor store presets</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map(rule => {
                                    const cfg = rule.config
                                    return (
                                        <div key={rule.id} className="bg-stone-900/80 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-colors">
                                            <div className="flex items-center justify-between px-5 py-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold">{rule.label}</span>
                                                        <span className="text-xs px-2 py-0.5 bg-stone-800 rounded text-stone-400 font-mono">
                                                            {rule.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-stone-500 mt-1">
                                                        {rule._count.categoryRules} dept(s) using • {rule.method}
                                                        {cfg.lockIfMsrpPresent && ' • MSRP lock'}
                                                        {cfg.managerOverrideOnly && ' • Manager only'}
                                                    </div>
                                                </div>
                                                {/* FIX 7: Delete only for PROVIDER/FRANCHISOR — not OWNER */}
                                                {canDestructiveEdit && (
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Tiers */}
                                            <div className="px-5 pb-4">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-xs text-stone-500">
                                                            <th className="text-left py-1">Cost Range</th>
                                                            <th className="text-left py-1">Markup</th>
                                                            <th className="text-left py-1">Min GP</th>
                                                            <th className="text-left py-1">Rounding</th>
                                                            <th className="text-left py-1">Max Markup</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {cfg.tiers.map((tier, i) => (
                                                            <tr key={i} className="border-t border-stone-800/50">
                                                                <td className="py-1.5 font-mono text-stone-300">
                                                                    ${tier.minCost.toFixed(2)} – ${tier.maxCost >= 999999 ? '∞' : tier.maxCost.toFixed(2)}
                                                                </td>
                                                                <td className="py-1.5 text-green-400 font-bold">{formatPct(tier.markupPct)}</td>
                                                                <td className="py-1.5 text-amber-400">${tier.minGrossProfit.toFixed(2)}</td>
                                                                {i === 0 && (
                                                                    <>
                                                                        <td className="py-1.5 text-stone-300" rowSpan={cfg.tiers.length}>
                                                                            {roundingNames[cfg.rounding] || cfg.rounding}
                                                                        </td>
                                                                        <td className="py-1.5 text-stone-300" rowSpan={cfg.tiers.length}>
                                                                            {formatPct(cfg.caps.maxMarkupPct)}
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ====== STEP 2: Category Mapping ====== */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Category → Pricing Rule</h2>
                                <p className="text-sm text-stone-400">Assign each department a pricing rule. Products inherit auto-pricing.</p>
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

                        {rules.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>Create pricing rules first (Step 1).</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="grid grid-cols-12 gap-4 px-5 py-2 text-xs font-medium text-stone-500 uppercase">
                                    <div className="col-span-5">Department</div>
                                    <div className="col-span-5">Pricing Rule</div>
                                    <div className="col-span-2 text-right">Markup</div>
                                </div>
                                {categories.map(cat => {
                                    const selectedRuleId = getCatRule(cat.id)
                                    const selectedRule = rules.find(r => r.id === selectedRuleId)
                                    const hasChange = mappingChanges[cat.id] !== undefined

                                    return (
                                        <div
                                            key={cat.id}
                                            className={`grid grid-cols-12 gap-4 px-5 py-3 rounded-lg transition-colors ${hasChange ? 'bg-green-500/5 border border-green-500/30' : 'bg-stone-900/50 border border-transparent hover:bg-stone-900/80'
                                                }`}
                                        >
                                            <div className="col-span-5 flex items-center gap-2">
                                                <span className="font-medium">{cat.name}</span>
                                                {hasChange && <span className="text-xs text-green-400">• changed</span>}
                                            </div>
                                            <div className="col-span-5">
                                                <select
                                                    value={selectedRuleId}
                                                    onChange={e => {
                                                        const val = e.target.value
                                                        const existing = catMappings.find(m => m.categoryId === cat.id)
                                                        if (existing && existing.pricingRuleId === val) {
                                                            const copy = { ...mappingChanges }
                                                            delete copy[cat.id]
                                                            setMappingChanges(copy)
                                                        } else {
                                                            setMappingChanges({ ...mappingChanges, [cat.id]: val })
                                                        }
                                                    }}
                                                    disabled={!canEdit}
                                                    className="w-full px-3 py-1.5 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-green-500"
                                                >
                                                    <option value="">— Not Assigned —</option>
                                                    {rules.map(r => (
                                                        <option key={r.id} value={r.id}>{r.label} ({r.name})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-end">
                                                {selectedRule ? (
                                                    <span className="text-sm font-bold text-green-400">
                                                        {formatPct(selectedRule.config.tiers[0]?.markupPct || 0)}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-600">—</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ====== STEP 3: Preview ====== */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Price Calculator Preview</h2>
                        <p className="text-sm text-stone-400">
                            Test how cost → sell price works with your pricing rules. Enter a cost and select a rule to see the calculated sell price.
                        </p>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-medium text-stone-400 mb-1 block">Cost ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={previewCost}
                                    onChange={e => setPreviewCost(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-lg font-mono focus:outline-none focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-stone-400 mb-1 block">Pricing Rule</label>
                                <select
                                    value={previewRule}
                                    onChange={e => setPreviewRule(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:border-green-500"
                                >
                                    <option value="">Select rule...</option>
                                    {rules.map(r => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-stone-400 mb-1 block">Sell Price</label>
                                <div className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-2xl font-bold text-green-400 font-mono">
                                    {previewResult ? `$${previewResult.price.toFixed(2)}` : '—'}
                                </div>
                            </div>
                        </div>

                        {previewResult && (
                            <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-3">
                                <h3 className="font-semibold text-sm text-stone-300">Calculation Details</h3>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-stone-500">Method</span>
                                        <div className="font-medium">{previewResult.method}</div>
                                    </div>
                                    <div>
                                        <span className="text-stone-500">Markup</span>
                                        <div className="font-medium text-green-400">
                                            {previewResult.tier ? formatPct(previewResult.tier.markupPct) : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-stone-500">Gross Profit</span>
                                        <div className="font-medium text-amber-400">
                                            ${(previewResult.price - parseFloat(previewCost)).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-stone-500">Margin</span>
                                        <div className="font-medium">
                                            {((1 - parseFloat(previewCost) / previewResult.price) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Quick comparison table */}
                                <div className="mt-4 border-t border-stone-800 pt-4">
                                    <h4 className="text-xs text-stone-500 mb-2">Sample costs with this rule:</h4>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[5, 10, 15, 25, 50].map(sampleCost => {
                                            const rule = rules.find(r => r.id === previewRule)
                                            if (!rule) return null
                                            const result = calculatePrice(sampleCost, rule.config)
                                            return (
                                                <div key={sampleCost} className="bg-stone-800/50 rounded-lg p-2 text-center">
                                                    <div className="text-xs text-stone-500">Cost ${sampleCost}</div>
                                                    <div className="text-sm font-bold text-green-400">${result.price.toFixed(2)}</div>
                                                    <div className="text-xs text-stone-500">
                                                        +${(result.price - sampleCost).toFixed(2)} GP
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
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
                    <div className="text-stone-500 text-sm">Step {step + 1} of {steps.length}</div>
                    <button
                        onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                        disabled={step === steps.length - 1}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-black rounded-lg font-medium text-sm disabled:opacity-30 transition-colors"
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl z-50 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}
        </div>
    )
}
