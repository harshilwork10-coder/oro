'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Vault, Plus, DollarSign, ArrowDownToLine, Building2, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function SafeManagementPage() {
    const { data: session } = useSession()
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formType, setFormType] = useState<'SAFE_COUNT' | 'SAFE_DROP' | 'BANK_DEPOSIT'>('SAFE_COUNT')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [denominations, setDenominations] = useState({
        hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0, quarters: 0, dimes: 0, nickels: 0, pennies: 0
    })

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/pos/safe-count')
            const data = await res.json()
            setHistory(data.data?.history || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchHistory() }, [])

    const calcTotal = () => {
        return denominations.hundreds * 100 + denominations.fifties * 50 + denominations.twenties * 20 +
            denominations.tens * 10 + denominations.fives * 5 + denominations.ones * 1 +
            denominations.quarters * 0.25 + denominations.dimes * 0.10 + denominations.nickels * 0.05 + denominations.pennies * 0.01
    }

    const handleSubmit = async () => {
        const body: any = { type: formType, notes }
        if (formType === 'SAFE_COUNT') body.denominations = denominations
        else body.amount = parseFloat(amount)

        await fetch('/api/pos/safe-count', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        setShowForm(false)
        setAmount('')
        setNotes('')
        fetchHistory()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Vault className="h-8 w-8 text-amber-500" /> Safe Management</h1>
                        <p className="text-stone-400">Safe counts, drops & bank deposits</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl">
                    <Plus className="h-4 w-4" /> New Entry
                </button>
            </div>

            {showForm && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                    <div className="flex gap-2 mb-4">
                        {(['SAFE_COUNT', 'SAFE_DROP', 'BANK_DEPOSIT'] as const).map(t => (
                            <button key={t} onClick={() => setFormType(t)} className={`px-4 py-2 rounded-xl text-sm ${formType === t ? 'bg-amber-600' : 'bg-stone-800 hover:bg-stone-700'}`}>
                                {t === 'SAFE_COUNT' ? <><DollarSign className="h-4 w-4 inline mr-1" />Count</> : t === 'SAFE_DROP' ? <><ArrowDownToLine className="h-4 w-4 inline mr-1" />Drop</> : <><Building2 className="h-4 w-4 inline mr-1" />Deposit</>}
                            </button>
                        ))}
                    </div>

                    {formType === 'SAFE_COUNT' ? (
                        <div className="grid grid-cols-5 gap-3 mb-4">
                            {Object.entries(denominations).map(([k, v]) => (
                                <div key={k}>
                                    <label className="text-xs text-stone-400 capitalize">{k}</label>
                                    <input type="number" min="0" value={v} onChange={e => setDenominations(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-center" />
                                </div>
                            ))}
                            <div className="col-span-5 text-right text-xl font-bold text-emerald-400">Total: {formatCurrency(calcTotal())}</div>
                        </div>
                    ) : (
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
                            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-4" />
                    )}
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3 mb-4" />
                    <button onClick={handleSubmit} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold">Submit</button>
                </div>
            )}

            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-stone-700">
                        <th className="text-left py-3 px-4 text-stone-400">Date</th>
                        <th className="text-left py-3 px-4 text-stone-400">Type</th>
                        <th className="text-right py-3 px-4 text-stone-400">Amount</th>
                        <th className="text-left py-3 px-4 text-stone-400">Notes</th>
                    </tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={4} className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></td></tr> :
                            history.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-stone-500">No entries yet</td></tr> :
                                history.map((h, i) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-3 px-4">{new Date(h.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs ${h.type === 'SAFE_COUNT' ? 'bg-blue-500/20 text-blue-400' : h.type === 'SAFE_DROP' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>{h.type}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(h.amount || 0)}</td>
                                        <td className="py-3 px-4 text-stone-400">{h.notes || '—'}</td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
