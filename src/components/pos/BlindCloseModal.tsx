'use client'

import { useState } from 'react'
import { X, Lock, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void; cashDrawerId?: string }

const DENOMS = [
    { key: 'hundreds', label: '$100', val: 100 }, { key: 'fifties', label: '$50', val: 50 },
    { key: 'twenties', label: '$20', val: 20 }, { key: 'tens', label: '$10', val: 10 },
    { key: 'fives', label: '$5', val: 5 }, { key: 'ones', label: '$1', val: 1 },
    { key: 'quarters', label: '25¢', val: 0.25 }, { key: 'dimes', label: '10¢', val: 0.10 },
    { key: 'nickels', label: '5¢', val: 0.05 }, { key: 'pennies', label: '1¢', val: 0.01 },
]

export default function BlindCloseModal({ open, onClose, cashDrawerId }: Props) {
    const [counts, setCounts] = useState<Record<string, number>>(Object.fromEntries(DENOMS.map(d => [d.key, 0])))
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const total = DENOMS.reduce((s, d) => s + (counts[d.key] || 0) * d.val, 0)

    const submit = async () => {
        setLoading(true)
        const res = await fetch('/api/pos/blind-close', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cashDrawerId, denominations: counts, countedTotal: total })
        })
        const data = await res.json()
        setResult(data.data)
        setSubmitted(true)
        setLoading(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-6 w-6 text-amber-500" /> Blind Close</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><X className="h-5 w-5" /></button>
                </div>

                {!submitted && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-sm text-amber-400">
                    Count your drawer <strong>before</strong> seeing the expected amount. This prevents bias.
                </div>}

                {submitted && result ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-stone-400 mb-2">Your Count</p>
                        <p className="text-3xl font-bold">{formatCurrency(total)}</p>
                        <p className="text-sm text-stone-400 mt-4 mb-2">Expected</p>
                        <p className="text-3xl font-bold">{formatCurrency(result.expected || 0)}</p>
                        <p className={`text-xl font-bold mt-4 ${Math.abs(result.variance || 0) < 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                            Variance: {formatCurrency(result.variance || (total - (result.expected || 0)))}
                        </p>
                        <button onClick={onClose} className="mt-6 px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl">Close</button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            {DENOMS.map(d => (
                                <div key={d.key}>
                                    <label className="text-[10px] text-stone-400 text-center block">{d.label}</label>
                                    <input type="number" min="0" value={counts[d.key]} onChange={e => setCounts(p => ({ ...p, [d.key]: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded px-1 py-2 text-center text-sm" />
                                </div>
                            ))}
                        </div>
                        <div className="text-center py-3 bg-stone-800 rounded-xl mb-4">
                            <p className="text-sm text-stone-400">Your Count</p>
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(total)}</p>
                        </div>
                        <button onClick={submit} disabled={loading} className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold disabled:opacity-50">
                            {loading ? 'Submitting...' : 'Submit Blind Count'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
