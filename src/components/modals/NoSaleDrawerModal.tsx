'use client'

import { useState } from 'react'
import { X, AlertTriangle, DollarSign, RefreshCw, Receipt, ChevronDown, Check, Loader2 } from 'lucide-react'

interface NoSaleDrawerModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    locationId: string
    shiftId?: string
}

// Reason options for no-sale drawer opens
const NO_SALE_REASONS = [
    { value: 'make_change', label: 'Make Change for Customer', icon: '💵', description: 'Customer needed change without purchase' },
    { value: 'verify_cash', label: 'Verify Drawer Count', icon: '🔢', description: 'Counting cash during shift' },
    { value: 'error_correction', label: 'Error Correction', icon: '✏️', description: 'Fix a previous mistake' },
    { value: 'give_receipt', label: 'Give Receipt', icon: '🧾', description: 'Customer returned for receipt' },
    { value: 'cash_drop', label: 'Cash Drop to Safe', icon: '🔒', description: 'Remove excess cash' },
    { value: 'manager_request', label: 'Manager Request', icon: '👔', description: 'Manager asked to open' },
    { value: 'other', label: 'Other Reason', icon: '📝', description: 'Specify in notes' }
]

export default function NoSaleDrawerModal({ isOpen, onClose, onSuccess, locationId, shiftId }: NoSaleDrawerModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError('Please select a reason')
            return
        }

        if (selectedReason === 'other' && !note.trim()) {
            setError('Please provide details for "Other" reason')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/drawer-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'NO_SALE',
                    reason: selectedReason,
                    note: note || null,
                    locationId,
                    shiftId
                })
            })

            if (res.ok) {
                // Open the drawer (if connected to hardware, send command here)
                console.log('📂 Drawer opened - No Sale logged')
                onSuccess()
                handleClose()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to log drawer activity')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setSelectedReason('')
        setNote('')
        setError('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg bg-stone-900 rounded-2xl border border-stone-700 overflow-hidden">
                {/* Header - Warning Banner */}
                <div className="bg-amber-500/10 border-b border-amber-500/30 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Open Drawer Without Sale</h2>
                            <p className="text-sm text-amber-300/70">This action is logged and monitored</p>
                        </div>
                        <button onClick={handleClose} className="ml-auto p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Reason Selection */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-3">
                            Why are you opening the drawer? <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {NO_SALE_REASONS.map(reason => (
                                <button
                                    key={reason.value}
                                    type="button"
                                    onClick={() => {
                                        setSelectedReason(reason.value)
                                        setError('')
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedReason === reason.value
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                        }`}
                                >
                                    <span className="text-2xl">{reason.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{reason.label}</p>
                                        <p className="text-xs text-stone-400">{reason.description}</p>
                                    </div>
                                    {selectedReason === reason.value && (
                                        <Check className="h-5 w-5 text-orange-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note (optional, required for "other") */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Additional Notes {selectedReason === 'other' && <span className="text-red-400">*</span>}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={selectedReason === 'other' ? 'Please explain the reason...' : 'Optional details...'}
                            rows={2}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white placeholder:text-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Warning Notice */}
                    <div className="p-3 bg-stone-800 border border-stone-700 rounded-lg">
                        <p className="text-xs text-stone-400 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>
                                All no-sale drawer opens are logged with your employee ID, timestamp, and reason.
                                Excessive no-sales may trigger management review.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-stone-700 p-4 flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedReason}
                        className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Opening...
                            </>
                        ) : (
                            <>
                                <DollarSign className="h-5 w-5" />
                                Open Drawer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
