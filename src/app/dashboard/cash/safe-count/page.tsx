'use client'

import { useState, useEffect } from 'react'
import { Vault, DollarSign, Building2, PiggyBank, Calculator } from 'lucide-react'

type ActionType = 'SAFE_COUNT' | 'DRAWER_COUNT' | 'SAFE_DROP' | 'BANK_DEPOSIT'

interface DenominationRow { label: string; value: number; count: number }

const DENOMINATIONS: DenominationRow[] = [
    { label: '$100', value: 100, count: 0 },
    { label: '$50', value: 50, count: 0 },
    { label: '$20', value: 20, count: 0 },
    { label: '$10', value: 10, count: 0 },
    { label: '$5', value: 5, count: 0 },
    { label: '$1', value: 1, count: 0 },
    { label: 'Quarters', value: 0.25, count: 0 },
    { label: 'Dimes', value: 0.10, count: 0 },
    { label: 'Nickels', value: 0.05, count: 0 },
    { label: 'Pennies', value: 0.01, count: 0 }
]

export default function SafeCountPage() {
    const [action, setAction] = useState<ActionType>('DRAWER_COUNT')
    const [denoms, setDenoms] = useState(DENOMINATIONS.map(d => ({ ...d })))
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [history, setHistory] = useState<any>(null)
    const [result, setResult] = useState<any>(null)

    const total = denoms.reduce((s, d) => s + d.value * d.count, 0)

    useEffect(() => {
        fetch('/api/pos/safe-count?days=7')
            .then(r => r.json())
            .then(d => setHistory(d))
            .catch(() => {})
    }, [result])

    const updateCount = (i: number, count: number) => {
        setDenoms(prev => prev.map((d, idx) => idx === i ? { ...d, count: Math.max(0, count) } : d))
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/pos/safe-count', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, amount: total, denominations: denoms, notes })
            })
            if (res.ok) {
                const data = await res.json()
                setResult(data)
                setDenoms(DENOMINATIONS.map(d => ({ ...d })))
                setNotes('')
            }
        } catch { /* error */ }
        setSubmitting(false)
    }

    const actions: { type: ActionType; label: string; icon: any; color: string }[] = [
        { type: 'DRAWER_COUNT', label: 'Drawer Count', icon: Calculator, color: 'bg-blue-600' },
        { type: 'SAFE_COUNT', label: 'Safe Count', icon: Vault, color: 'bg-emerald-600' },
        { type: 'SAFE_DROP', label: 'Safe Drop', icon: PiggyBank, color: 'bg-purple-600' },
        { type: 'BANK_DEPOSIT', label: 'Bank Deposit', icon: Building2, color: 'bg-amber-600' }
    ]

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <Vault className="h-8 w-8 text-emerald-400" />
                    Cash Accountability
                </h1>
                <p className="text-stone-400 mb-8">Drawer count, safe count, safe drop, bank deposit</p>

                {/* Action Selector */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {actions.map(a => (
                        <button key={a.type} onClick={() => setAction(a.type)} className={`py-3 rounded-xl font-medium flex flex-col items-center gap-2 transition-all ${action === a.type ? `${a.color} text-white shadow-lg` : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                            <a.icon className="h-6 w-6" />
                            <span className="text-sm">{a.label}</span>
                        </button>
                    ))}
                </div>

                {/* Denomination Grid */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">Denomination Breakdown</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {denoms.map((d, i) => (
                            <div key={d.label} className="flex items-center gap-3 bg-stone-800 rounded-lg p-3">
                                <span className="w-20 text-stone-400 text-sm">{d.label}</span>
                                <div className="flex items-center gap-2 flex-1">
                                    <button onClick={() => updateCount(i, d.count - 1)} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white text-lg font-bold">-</button>
                                    <input type="number" value={d.count || ''} onChange={e => updateCount(i, parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 bg-stone-900 border border-stone-700 rounded text-center text-white" />
                                    <button onClick={() => updateCount(i, d.count + 1)} className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-white text-lg font-bold">+</button>
                                </div>
                                <span className="w-20 text-right font-medium text-emerald-400">${(d.value * d.count).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-stone-700 mt-4 pt-4 flex items-center justify-between">
                        <span className="text-lg font-bold">Total</span>
                        <span className="text-3xl font-bold text-emerald-400">${total.toFixed(2)}</span>
                    </div>
                </div>

                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white mb-4" />

                <button onClick={handleSubmit} disabled={submitting || total <= 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 transition-all">
                    {submitting ? 'Saving...' : `Submit ${actions.find(a => a.type === action)?.label}`}
                </button>

                {/* Success Banner */}
                {result && (
                    <div className="mt-4 bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-emerald-400 font-medium">
                        ✓ {action.replace('_', ' ')} recorded — ${total.toFixed(2)}
                    </div>
                )}

                {/* History */}
                {history?.summary && (
                    <div className="mt-8 bg-stone-900 border border-stone-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-4">Last 7 Days</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-stone-800 rounded-lg p-4">
                                <div className="text-stone-400 text-sm mb-1">Last Safe Count</div>
                                <div className="text-xl font-bold">${Number(history.summary.lastSafeCount || 0).toFixed(2)}</div>
                            </div>
                            <div className="bg-stone-800 rounded-lg p-4">
                                <div className="text-stone-400 text-sm mb-1">Total Drops</div>
                                <div className="text-xl font-bold">${Number(history.summary.totalDrops || 0).toFixed(2)}</div>
                            </div>
                            <div className="bg-stone-800 rounded-lg p-4">
                                <div className="text-stone-400 text-sm mb-1">Total Deposits</div>
                                <div className="text-xl font-bold">${Number(history.summary.totalDeposits || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
