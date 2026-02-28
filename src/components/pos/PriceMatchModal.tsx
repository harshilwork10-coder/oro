'use client'

import { useState } from 'react'
import { X, Scale, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void; itemName?: string; ourPrice?: number }

export default function PriceMatchModal({ open, onClose, itemName, ourPrice = 0 }: Props) {
    const [competitor, setCompetitor] = useState('')
    const [theirPrice, setTheirPrice] = useState('')
    const [proof, setProof] = useState('')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const submit = async () => {
        setLoading(true)
        const res = await fetch('/api/pos/price-match', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: '', competitorName: competitor, competitorPrice: parseFloat(theirPrice), proof })
        })
        setResult((await res.json()).data)
        setLoading(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Scale className="h-6 w-6 text-teal-500" /> Price Match</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><X className="h-5 w-5" /></button>
                </div>

                {result ? (
                    <div className="text-center py-6">
                        {result.matched ? (
                            <>
                                <Check className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                                <p className="text-lg font-bold text-emerald-400">Price Matched!</p>
                                <p className="text-stone-400 mt-2">Apply {formatCurrency(result.discount)} discount at checkout</p>
                            </>
                        ) : <p className="text-stone-400">{result.message}</p>}
                        <button onClick={onClose} className="mt-6 px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl">Close</button>
                    </div>
                ) : (
                    <>
                        {itemName && <p className="text-stone-400 mb-4">Item: <strong>{itemName}</strong> — Our price: {formatCurrency(ourPrice)}</p>}
                        <input value={competitor} onChange={e => setCompetitor(e.target.value)} placeholder="Competitor name (e.g., Target)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />
                        <input type="number" step="0.01" value={theirPrice} onChange={e => setTheirPrice(e.target.value)} placeholder="Their price" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />
                        <input value={proof} onChange={e => setProof(e.target.value)} placeholder="Proof (ad, website, etc.)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-4" />
                        <button onClick={submit} disabled={loading || !theirPrice} className="w-full py-3 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold disabled:opacity-50">
                            {loading ? 'Checking...' : 'Request Price Match'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
