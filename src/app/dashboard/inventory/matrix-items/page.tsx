'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Grid2x2, Plus, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function MatrixItemsPage() {
    const [matrices, setMatrices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [variants, setVariants] = useState<any[]>([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ parentName: '', variants: [{ name: '', sku: '', price: 0, attributes: {} as any }] })

    useEffect(() => { fetch('/api/inventory/matrix-items').then(r => r.json()).then(d => { setMatrices(d.data?.matrices || []); setLoading(false) }) }, [])

    const expand = async (id: string) => {
        if (expanded === id) { setExpanded(null); return }
        const res = await fetch(`/api/inventory/matrix-items?parentId=${id}`)
        const d = await res.json()
        setVariants(d.data?.variants || [])
        setExpanded(id)
    }

    const create = async () => {
        await fetch('/api/inventory/matrix-items', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        setShowForm(false)
        const r = await fetch('/api/inventory/matrix-items'); const d = await r.json(); setMatrices(d.data?.matrices || [])
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory/products" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><Grid2x2 className="h-8 w-8 text-indigo-500" /> Matrix Items</h1><p className="text-stone-400">Products with size/color variants</p></div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl"><Plus className="h-4 w-4" /> New Matrix</button>
            </div>

            {showForm && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                    <input value={form.parentName} onChange={e => setForm(p => ({ ...p, parentName: e.target.value }))} placeholder="Product name (e.g., Basic T-Shirt)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-4" />
                    <h3 className="font-semibold mb-2">Variants</h3>
                    {form.variants.map((v, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                            <input value={v.name} onChange={e => { const u = [...form.variants]; u[i].name = e.target.value; setForm(p => ({ ...p, variants: u })) }} placeholder="Variant (e.g., Large Red)" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                            <input value={v.sku} onChange={e => { const u = [...form.variants]; u[i].sku = e.target.value; setForm(p => ({ ...p, variants: u })) }} placeholder="SKU" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                            <input type="number" step="0.01" value={v.price} onChange={e => { const u = [...form.variants]; u[i].price = parseFloat(e.target.value) || 0; setForm(p => ({ ...p, variants: u })) }} placeholder="Price" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2" />
                        </div>
                    ))}
                    <button onClick={() => setForm(p => ({ ...p, variants: [...p.variants, { name: '', sku: '', price: 0, attributes: {} }] }))} className="text-sm text-indigo-400 hover:text-indigo-300 mb-4">+ Add variant</button>
                    <br /><button onClick={create} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold">Create Matrix Item</button>
                </div>
            )}

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : matrices.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><Grid2x2 className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>No matrix items yet</p></div>
            ) : (
                <div className="space-y-2">
                    {matrices.map(m => (
                        <div key={m.id}>
                            <button onClick={() => expand(m.id)} className="w-full bg-stone-900/80 border border-stone-700 rounded-xl p-4 flex items-center justify-between hover:bg-stone-800/80">
                                <span className="font-semibold">{m.name}</span>
                                {expanded === m.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </button>
                            {expanded === m.id && (
                                <div className="ml-4 mt-1 space-y-1">
                                    {variants.map((v: any) => (
                                        <div key={v.id} className="bg-stone-800/50 rounded-lg p-3 flex justify-between items-center">
                                            <div><span className="font-medium">{v.name}</span> <span className="text-stone-500 text-xs ml-2">{v.sku}</span></div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm">Stock: {v.stock}</span>
                                                <span className="font-mono text-emerald-400">{formatCurrency(v.price)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
