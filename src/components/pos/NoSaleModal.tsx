'use client'

import { useState } from 'react'
import { X, Unlock, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    cashDrawerSessionId: string
    storeName?: string
    cashierName?: string
}

const REASONS_NO_SALE = [
    'Make Change',
    'Verify Cash Count',
    'Error Correction',
    'Give Receipt',
    'Cash Drop',
    'Manager Request',
    'Other'
]

export default function NoSaleModal({ isOpen, onClose, onSuccess, cashDrawerSessionId, storeName, cashierName }: Props) {
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!reason) {
            setToast({ type: 'error', message: 'Select a reason' })
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/no-sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason,
                    reasonNote: note || undefined,
                    stationId: cashDrawerSessionId // API uses stationId for lookup or shift info
                })
            })

            if (res.ok) {
                setToast({ type: 'success', message: `✓ Drawer Opened (No Sale)` })

                // Print receipt
                try {
                    const { printReceipt, isPrintAgentAvailable } = await import('@/lib/print-agent')
                    const agentAvailable = await isPrintAgentAvailable()
                    if (agentAvailable) {
                        await printReceipt({
                            storeName: storeName || undefined,
                            cashier: cashierName || undefined,
                            header: '*** NO SALE ***',
                            items: [{ name: reason, quantity: 1, price: 0, total: 0 }],
                            subtotal: 0,
                            tax: 0,
                            total: 0,
                            date: new Date().toLocaleString(),
                            footer: note ? `Note: ${note}` : '',
                            openDrawer: true,
                        }).catch(console.error)
                    }
                } catch (e) { console.error('No sale receipt error:', e) }

                setTimeout(() => { onSuccess(); onClose() }, 1200)
            } else {
                const error = await res.json()
                setToast({ type: 'error', message: error.error || 'Failed' })
            }
        } catch (error) {
            console.error('No sale error:', error)
            setToast({ type: 'error', message: 'Network error' })
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-amber-900/10">
                    <div className="flex items-center gap-2">
                        <Unlock className="h-6 w-6 text-amber-500" />
                        <h2 className="text-xl font-bold text-white">Open Drawer (No Sale)</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Reason */}
                    <div>
                        <label className="text-stone-400 text-sm mb-1 block">Reason *</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="">Select a reason...</option>
                            {REASONS_NO_SALE.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-stone-400 text-sm mb-1 block">Note / Cash Verified (optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Additional details..."
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-stone-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason || isProcessing}
                        className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : 'Open Drawer'}
                    </button>
                </div>
            </div>
        </div>
    )
}
