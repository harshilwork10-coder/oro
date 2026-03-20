'use client'

import { useState } from 'react'
import { X, PackageSearch, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void }

export default function PreOrderModal({ open, onClose }: Props) {
    const [itemSearch, setItemSearch] = useState('')
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const [qty, setQty] = useState(1)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [deposit, setDeposit] = useState(0)
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const createPreOrder = async () => {
        if (!selectedItem) return
        setLoading(true)
        const res = await fetch('/api/pos/pre-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: selectedItem.id, quantity: qty, customerName, customerPhone, depositAmount: deposit })
        })
        const data = await res.json()
        setResult(data.data)
        setLoading(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><PackageSearch className="h-6 w-6 text-orange-500" /> Pre-Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><X className="h-5 w-5" /></button>
                </div>

                {result ? (
                    <div className="text-center py-6">
                        <p className="text-xl font-bold text-emerald-400 mb-2">Pre-Order Created!</p>
                        <p className="text-stone-400">{result.itemName} × {qty}</p>
                        <p className="text-lg mt-2">Total: {formatCurrency(result.total)}</p>
                        <p className="text-stone-400">Deposit: {formatCurrency(result.depositPaid)} • Balance: {formatCurrency(result.balanceDue)}</p>
                        <button onClick={onClose} className="mt-6 px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl">Done</button>
                    </div>
                ) : (
                    <>
                        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />
                        <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search item (barcode or name)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />

                        <div className="flex gap-3 mb-3">
                            <div className="flex-1">
                                <label className="text-xs text-stone-400">Quantity</label>
                                <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-stone-400">Deposit</label>
                                <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(parseFloat(e.target.value) || 0)} className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3" />
                            </div>
                        </div>

                        <button onClick={createPreOrder} disabled={loading || !customerName}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Pre-Order'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
