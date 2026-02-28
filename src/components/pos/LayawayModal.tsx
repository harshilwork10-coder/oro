'use client'

import { useState } from 'react'
import { X, Archive, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void; cartItems?: any[]; cartTotal?: number }

export default function LayawayModal({ open, onClose, cartItems = [], cartTotal = 0 }: Props) {
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [depositAmount, setDepositAmount] = useState(Math.round(cartTotal * 0.2 * 100) / 100) // 20% default deposit
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const createLayaway = async () => {
        setLoading(true)
        const res = await fetch('/api/pos/layaway', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName, customerPhone, items: cartItems, depositAmount })
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
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Archive className="h-6 w-6 text-purple-500" /> Layaway</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg"><X className="h-5 w-5" /></button>
                </div>

                {result ? (
                    <div className="text-center py-6">
                        <p className="text-xl font-bold text-emerald-400 mb-2">Layaway Created!</p>
                        <p className="text-stone-400">Total: {formatCurrency(result.total || cartTotal)}</p>
                        <p className="text-stone-400">Deposit: {formatCurrency(result.depositPaid || depositAmount)}</p>
                        <p className="text-lg font-semibold mt-2">Balance: {formatCurrency(result.balanceDue || (cartTotal - depositAmount))}</p>
                        <button onClick={onClose} className="mt-6 px-6 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl">Done</button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                            <p className="text-sm text-stone-400">Cart Total</p>
                            <p className="text-3xl font-bold text-purple-400">{formatCurrency(cartTotal)}</p>
                            <p className="text-xs text-stone-500 mt-1">{cartItems.length} items</p>
                        </div>

                        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-3" />

                        <div className="mb-4">
                            <label className="text-sm text-stone-400">Deposit Amount</label>
                            <div className="flex items-center gap-2 mt-1">
                                <DollarSign className="h-5 w-5 text-stone-400" />
                                <input type="number" step="0.01" value={depositAmount} onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                                    className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 font-mono" />
                            </div>
                            <p className="text-xs text-stone-500 mt-1">Minimum 20% • Balance: {formatCurrency(cartTotal - depositAmount)}</p>
                        </div>

                        <button onClick={createLayaway} disabled={loading || !customerName}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Layaway'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
