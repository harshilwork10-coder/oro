'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft, Package, Plus, Check, X, Truck, ClipboardCheck } from 'lucide-react'

interface Transfer {
    id: string
    transferNumber: string
    status: string
    fromLocation: { name: string }
    toLocation: { name: string }
    createdAt: string
    items: any[]
}

export default function StockTransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)

    useEffect(() => {
        fetch('/api/pos/stock-transfer')
            .then(r => r.json())
            .then(d => { setTransfers(d.transfers || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const handleAction = async (id: string, action: string) => {
        const res = await fetch(`/api/pos/stock-transfer/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        })
        if (res.ok) {
            const data = await res.json()
            setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: data.transfer?.status || action } : t))
        }
    }

    const statusColors: Record<string, string> = {
        PENDING: 'bg-amber-500/20 text-amber-400',
        APPROVED: 'bg-blue-500/20 text-blue-400',
        SHIPPED: 'bg-purple-500/20 text-purple-400',
        RECEIVED: 'bg-emerald-500/20 text-emerald-400',
        CANCELLED: 'bg-red-500/20 text-red-400'
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Truck className="h-8 w-8 text-blue-400" />
                            Stock Transfers
                        </h1>
                        <p className="text-stone-400 mt-1">Create, track, and manage inventory transfers between locations</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium flex items-center gap-2 transition-colors">
                        <Plus className="h-5 w-5" /> New Transfer
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-stone-500">Loading transfers...</div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-20 bg-stone-900 rounded-2xl border border-stone-800">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-500">No transfers yet. Create your first transfer above.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transfers.map(t => (
                            <div key={t.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-lg font-bold text-blue-400">#{t.transferNumber}</div>
                                        <div className="flex items-center gap-2 text-sm text-stone-300">
                                            <span>{t.fromLocation?.name || '—'}</span>
                                            <ArrowRight className="h-4 w-4 text-stone-500" />
                                            <span>{t.toLocation?.name || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[t.status] || 'bg-stone-700 text-stone-300'}`}>
                                            {t.status}
                                        </span>
                                        <span className="text-stone-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-4">
                                    {t.status === 'PENDING' && (
                                        <>
                                            <button onClick={() => handleAction(t.id, 'APPROVE')} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-sm font-medium flex items-center gap-1"><Check className="h-4 w-4" /> Approve</button>
                                            <button onClick={() => handleAction(t.id, 'CANCEL')} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium flex items-center gap-1"><X className="h-4 w-4" /> Cancel</button>
                                        </>
                                    )}
                                    {t.status === 'APPROVED' && (
                                        <button onClick={() => handleAction(t.id, 'SHIP')} className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-lg text-sm font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> Ship</button>
                                    )}
                                    {t.status === 'SHIPPED' && (
                                        <button onClick={() => handleAction(t.id, 'RECEIVE')} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-sm font-medium flex items-center gap-1"><ClipboardCheck className="h-4 w-4" /> Receive</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
