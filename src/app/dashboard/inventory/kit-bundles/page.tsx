'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, PackagePlus, Plus, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function KitBundlesPage() {
    const [bundles, setBundles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', price: 0, barcode: '', components: [{ itemId: '', quantity: 1 }] })

    useEffect(() => { fetch('/api/inventory/kit-bundle').then(r => r.json()).then(d => { setBundles(d.data?.bundles || []); setLoading(false) }) }, [])

    const create = async () => {
        await fetch('/api/inventory/kit-bundle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setShowForm(false)
        const r = await fetch('/api/inventory/kit-bundle'); const d = await r.json(); setBundles(d.data?.bundles || [])
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory/products" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><PackagePlus className="h-8 w-8 text-pink-500" /> Kit / Bundles</h1><p className="text-stone-400">Sell as one SKU, deduct component items</p></div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl"><Plus className="h-4 w-4" /> Create Bundle</button>
            </div>

            {showForm && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Bundle name (e.g., Gift Basket)" className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                        <input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} placeholder="Bundle price" className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                        <input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Barcode (optional)" className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                    </div>
                    <h3 className="font-semibold mb-2">Components</h3>
                    {form.components.map((c, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                            <input value={c.itemId} onChange={e => { const u = [...form.components]; u[i].itemId = e.target.value; setForm(p => ({ ...p, components: u })) }} placeholder="Item ID" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                            <input type="number" min="1" value={c.quantity} onChange={e => { const u = [...form.components]; u[i].quantity = parseInt(e.target.value) || 1; setForm(p => ({ ...p, components: u })) }} placeholder="Qty" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                        </div>
                    ))}
                    <button onClick={() => setForm(p => ({ ...p, components: [...p.components, { itemId: '', quantity: 1 }] }))} className="text-sm text-pink-400 hover:text-pink-300 mb-4">+ Add component</button>
                    <br /><button onClick={create} className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 rounded-xl font-semibold">Create Bundle</button>
                </div>
            )}

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : bundles.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><PackagePlus className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>No bundles yet</p></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bundles.map(b => (
                        <div key={b.id} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <h3 className="font-semibold text-lg">{b.name}</h3>
                            {b.barcode && <p className="text-xs text-stone-500 mt-1">{b.barcode}</p>}
                            <p className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(b.price)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
