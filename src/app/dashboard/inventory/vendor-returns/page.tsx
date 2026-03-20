'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Plus, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function VendorReturnsPage() {
    const [returns, setReturns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ vendorId: '', reason: 'DAMAGED', items: [{ itemId: '', quantity: 1 }], notes: '' })

    useEffect(() => { fetch('/api/inventory/vendor-returns').then(r => r.json()).then(d => { setReturns(d.data?.returns || []); setLoading(false) }) }, [])

    const submit = async () => {
        await fetch('/api/inventory/vendor-returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setShowForm(false)
        const r = await fetch('/api/inventory/vendor-returns'); const d = await r.json(); setReturns(d.data?.returns || [])
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory/products" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><RotateCcw className="h-8 w-8 text-red-500" /> Vendor Returns (RMA)</h1><p className="text-stone-400">Return damaged/expired/recalled goods to vendors</p></div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl"><Plus className="h-4 w-4" /> New Return</button>
            </div>

            {showForm && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input value={form.vendorId} onChange={e => setForm(p => ({ ...p, vendorId: e.target.value }))} placeholder="Vendor ID" className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                        <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-3">
                            <option value="DAMAGED">Damaged</option><option value="DEFECTIVE">Defective</option><option value="EXPIRED">Expired</option><option value="RECALL">Recall</option><option value="OVERSTOCK">Overstock</option>
                        </select>
                    </div>
                    {form.items.map((item, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                            <input value={item.itemId} onChange={e => { const u = [...form.items]; u[i].itemId = e.target.value; setForm(p => ({ ...p, items: u })) }} placeholder="Item ID" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                            <input type="number" min="1" value={item.quantity} onChange={e => { const u = [...form.items]; u[i].quantity = parseInt(e.target.value) || 1; setForm(p => ({ ...p, items: u })) }} placeholder="Qty" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                        </div>
                    ))}
                    <button onClick={() => setForm(p => ({ ...p, items: [...p.items, { itemId: '', quantity: 1 }] }))} className="text-sm text-red-400 mb-3">+ Add item</button>
                    <br /><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-4" />
                    <button onClick={submit} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-semibold">Create RMA</button>
                </div>
            )}

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : returns.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><RotateCcw className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>No vendor returns</p></div>
            ) : (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">Date</th>
                            <th className="text-left py-3 px-4 text-stone-400">RMA #</th>
                            <th className="text-left py-3 px-4 text-stone-400">Reason</th>
                            <th className="text-right py-3 px-4 text-stone-400">Credit</th>
                            <th className="text-left py-3 px-4 text-stone-400">Status</th>
                        </tr></thead>
                        <tbody>
                            {returns.map((r: any) => (
                                <tr key={r.id} className="border-b border-stone-800">
                                    <td className="py-3 px-4">{new Date(r.createdAt || r.orderDate).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 font-mono text-xs">{r.id?.slice(0, 8)}</td>
                                    <td className="py-3 px-4"><span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">{r.reason || r.notes}</span></td>
                                    <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(r.expectedCredit || r.totalCost || 0)}</td>
                                    <td className="py-3 px-4"><span className="px-2 py-1 bg-stone-500/20 text-stone-400 rounded text-xs">{r.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
