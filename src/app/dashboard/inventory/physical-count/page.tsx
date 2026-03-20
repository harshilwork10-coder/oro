'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, RefreshCw, Plus, Trash2 } from 'lucide-react'

export default function PhysicalCountPage() {
    const [items, setItems] = useState<{ barcode: string; name: string; counted: number; expected: number }[]>([])
    const [barcode, setBarcode] = useState('')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const addItem = () => {
        if (!barcode) return
        setItems(p => [...p, { barcode, name: barcode, counted: 0, expected: 0 }])
        setBarcode('')
    }

    const submit = async () => {
        setLoading(true)
        const res = await fetch('/api/inventory/physical-count', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ counts: items.map(i => ({ barcode: i.barcode, counted: i.counted })) })
        })
        setResult((await res.json()).data)
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/inventory/products" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="h-8 w-8 text-teal-500" /> Physical Count</h1><p className="text-stone-400">Count inventory and reconcile variances</p></div>
            </div>

            {result ? (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 text-emerald-400">Count Submitted!</h2>
                    <p className="text-stone-400">{result.processed || items.length} items counted</p>
                    <p className="text-stone-400">{result.adjustments || 0} adjustment(s) created</p>
                    <button onClick={() => { setResult(null); setItems([]) }} className="mt-4 px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl">New Count</button>
                </div>
            ) : (
                <>
                    <div className="flex gap-3 mb-6">
                        <input value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                            placeholder="Scan barcode or enter item" className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" autoFocus />
                        <button onClick={addItem} className="px-4 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl"><Plus className="h-5 w-5" /></button>
                    </div>

                    {items.length > 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden mb-6">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-stone-700">
                                    <th className="text-left py-3 px-4 text-stone-400">Item / Barcode</th>
                                    <th className="text-center py-3 px-4 text-stone-400">Counted</th>
                                    <th className="text-center py-3 px-4 text-stone-400"></th>
                                </tr></thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-b border-stone-800">
                                            <td className="py-3 px-4">{item.barcode}</td>
                                            <td className="py-3 px-4 text-center">
                                                <input type="number" min="0" value={item.counted} onChange={e => { const u = [...items]; u[i].counted = parseInt(e.target.value) || 0; setItems(u) }}
                                                    className="w-20 bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-center" />
                                            </td>
                                            <td className="py-3 px-4 text-center"><button onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button onClick={submit} disabled={loading || items.length === 0} className="px-8 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
                        {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</> : <><ClipboardCheck className="h-4 w-4" /> Submit Count ({items.length} items)</>}
                    </button>
                </>
            )}
        </div>
    )
}
