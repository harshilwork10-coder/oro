'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Lock, Calendar, FileText } from 'lucide-react'

interface StoreEodModalProps {
    onClose: () => void
    onComplete: (report: any) => void
    tzDate?: string
}

export default function StoreEodModal({ onClose, onComplete, tzDate }: StoreEodModalProps) {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [eodData, setEodData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    
    // UI steps: 'preview' | 'count' | 'variance' | 'success'
    const [step, setStep] = useState<'preview' | 'count' | 'variance' | 'success'>('preview')
    
    const [actualCash, setActualCash] = useState<string>('')
    const [varianceNote, setVarianceNote] = useState<string>('')

    const dateToFetch = tzDate || new Date().toISOString().split('T')[0]

    useEffect(() => {
        fetchPreview()
    }, [])

    const fetchPreview = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/pos/eod?tzDate=${dateToFetch}`)
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Failed to load EOD preview')
                setLoading(false)
                return
            }
            setEodData(data)
        } catch (err: any) {
            setError(err.message || 'Network error fetching EOD')
        } finally {
            setLoading(false)
        }
    }

    const handleFinalize = async () => {
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch(`/api/pos/eod`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tzDate: dateToFetch,
                    actualCash: Number(actualCash),
                    varianceNote
                })
            })
            const data = await res.json()
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to finalize EOD')
            }
            
            setEodData({ ...eodData, report: data.report })
            setStep('success')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const formatCash = (amt: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt)

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
                <div className="p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl w-full max-w-md text-center">
                    <p className="text-amber-500 font-bold mb-2">Loading Store Totals...</p>
                    <p className="text-stone-500 text-sm">Auditing transaction ledgers securely.</p>
                </div>
            </div>
        )
    }

    // Handled Error State
    if (error && !eodData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                <div className="p-6 bg-stone-900 rounded-2xl border border-stone-800 w-full max-w-md relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-stone-500 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-center text-white mb-2">Error Loading EOD</h2>
                    <p className="text-stone-400 text-center mb-6">{error}</p>
                    <button onClick={onClose} className="w-full py-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-white font-bold">Close</button>
                </div>
            </div>
        )
    }

    // Already closed state
    if (eodData?.alreadyClosed) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                <div className="p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl w-full max-w-md text-center relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-stone-500 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                    <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Day Already Closed</h2>
                    <p className="text-stone-400 mb-6">The End of Day report for {dateToFetch} has already been finalized.</p>
                    <button 
                        onClick={() => onComplete(eodData.report)}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                    >
                        <FileText className="h-5 w-5" /> View Persisted Report
                    </button>
                </div>
            </div>
        )
    }

    const { summary } = eodData
    const hasOpenShifts = summary.openShifts && summary.openShifts.length > 0

    // Blocking State: Open Shifts
    if (hasOpenShifts) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                <div className="p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl w-full max-w-lg relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-stone-500 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-red-500/20 p-3 rounded-full">
                            <Lock className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Cannot Close Day</h2>
                            <p className="text-red-400 text-sm">Outstanding open shifts detected</p>
                        </div>
                    </div>
                    
                    <p className="text-stone-300 mb-4">All cashiers must close their shifts before the store can be reconciled for the night.</p>
                    
                    <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 mb-6 space-y-3">
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Open Shifts</h3>
                        {summary.openShifts.map((sec: any) => (
                            <div key={sec.id} className="flex justify-between items-center p-3 bg-stone-900 rounded-lg border border-stone-800">
                                <div>
                                    <p className="font-bold text-white">{sec.employeeName}</p>
                                    <p className="text-xs text-stone-500">Since {new Date(sec.startTime).toLocaleTimeString()}</p>
                                </div>
                                <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-1 rounded">OPEN</span>
                            </div>
                        ))}
                    </div>

                    <button onClick={onClose} className="w-full py-4 bg-stone-800 hover:bg-stone-700 rounded-xl text-white font-bold transition-all">
                        Got it, I'll close them
                    </button>
                </div>
            </div>
        )
    }

    // Helper for variance UI
    const expected = summary.data.expectedCash
    const counted = Number(actualCash)
    const variance = counted - expected

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl w-full max-w-2xl my-8 relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-stone-800 bg-stone-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-amber-500" />
                        <h2 className="text-xl font-bold text-white">Manager EOD: <span className="font-mono text-stone-400 font-normal">{dateToFetch}</span></h2>
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Error Banner */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                    <p className="text-sm text-stone-500">Gross Sales</p>
                                    <p className="text-2xl font-bold text-white">{formatCash(summary.data.grossSales)}</p>
                                    <div className="flex justify-between mt-2 text-xs text-stone-400">
                                        <span>Cash: {formatCash(summary.data.cashSales)}</span>
                                        <span>Card: {formatCash(summary.data.cardSales)}</span>
                                    </div>
                                </div>
                                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                    <p className="text-sm text-stone-500">Net Sales</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCash(summary.data.netSales)}</p>
                                    <div className="flex justify-between mt-2 text-xs text-stone-400">
                                        <span>Txs: {summary.data.transactionCount}</span>
                                        <span>Refunds: {formatCash(summary.data.refunds)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-stone-800/30 p-5 rounded-xl border border-stone-800">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-stone-400"/> Cash Reconciliation
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-stone-300">
                                        <span>Opening Base (Total mapped)</span>
                                        <span>{formatCash(summary.data.openingCashTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400">
                                        <span>+ Cash Sales In</span>
                                        <span>{formatCash(summary.data.cashSales)}</span>
                                    </div>
                                    <div className="flex justify-between text-teal-400">
                                        <span>+ Split Cash In & Paid In</span>
                                        <span>{formatCash(summary.data.splitCash + summary.data.paidInTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-400">
                                        <span>- Refunds Out</span>
                                        <span>{formatCash(summary.data.cashRefunds)}</span>
                                    </div>
                                    <div className="flex justify-between text-orange-400">
                                        <span>- Drops & Paid Out</span>
                                        <span>{formatCash(summary.data.cashDropsTotal + summary.data.paidOutTotal)}</span>
                                    </div>
                                    
                                    <div className="border-t border-stone-700 pt-3 mt-3 flex justify-between items-center bg-stone-900 p-3 rounded-lg">
                                        <span className="font-bold text-white">Expected Master Drawer</span>
                                        <span className="text-xl font-bold text-white">{formatCash(summary.data.expectedCash)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setStep('count')}
                                className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold transition-all"
                            >
                                Continue to Drawer Count →
                            </button>
                        </div>
                    )}

                    {step === 'count' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-white">Count Master Cash</h3>
                                <p className="text-stone-400 text-sm">Enter the exact physical cash amount present.</p>
                            </div>

                            <div className="bg-stone-950 p-6 rounded-2xl border border-stone-800">
                                <label className="block text-sm font-bold text-stone-500 mb-2">Total Counted Cash ($)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    autoFocus
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    className="w-full text-center text-4xl font-bold bg-transparent border-b-2 border-stone-700 focus:border-amber-500 focus:ring-0 text-white pb-2 outline-none"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep('preview')} className="flex-1 py-4 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold text-white">
                                    Back
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!actualCash || isNaN(Number(actualCash))) return setError('Please enter a valid amount')
                                        setError(null)
                                        if (Math.abs(Number(actualCash) - summary.data.expectedCash) > 5) {
                                            setStep('variance')
                                        } else {
                                            handleFinalize()
                                        }
                                    }}
                                    disabled={!actualCash || submitting}
                                    className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl text-white font-bold"
                                >
                                    Verify →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'variance' && (
                        <div className="space-y-6">
                            <div className="bg-red-500/10 border-2 border-red-500/30 p-6 rounded-2xl text-center">
                                <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-white mb-1">Variance Detected</h3>
                                <p className="text-stone-400 text-sm mb-4">Your count deviates significantly from the expected ledger.</p>
                                
                                <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mb-4 bg-stone-900 p-4 rounded-xl">
                                    <div>
                                        <p className="text-xs text-stone-500">Expected</p>
                                        <p className="font-mono text-lg">{formatCash(expected)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">Counted</p>
                                        <p className="font-mono text-lg">{formatCash(counted)}</p>
                                    </div>
                                    <div className="col-span-2 border-t border-stone-800 pt-2 flex justify-between items-center">
                                        <span className="text-sm font-bold text-stone-400">Difference</span>
                                        <span className={`font-mono font-bold text-lg ${variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {variance > 0 ? '+' : ''}{formatCash(variance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-300 mb-2">Manager Explanation Note Required</label>
                                <textarea
                                    autoFocus
                                    value={varianceNote}
                                    onChange={(e) => setVarianceNote(e.target.value)}
                                    placeholder="Explain this variance before closing the day..."
                                    className="w-full h-32 bg-stone-950 border border-stone-700 focus:border-red-500 rounded-xl p-4 text-white placeholder:text-stone-600 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep('count')} className="flex-1 py-4 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold text-white">
                                    Recount
                                </button>
                                <button 
                                    onClick={handleFinalize}
                                    disabled={!varianceNote.trim() || submitting}
                                    className="flex-[2] py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-white font-bold flex justify-center items-center gap-2"
                                >
                                    {submitting ? 'Closing Day...' : 'Approve & Close Day'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-3xl font-bold text-white mb-2">Store Day Closed!</h2>
                            <p className="text-stone-400 mb-8">The Z-Report snapshot has been persisted to the ledger.</p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={onClose} 
                                    className="flex-1 py-4 bg-stone-800 hover:bg-stone-700 rounded-xl text-white font-bold"
                                >
                                    Dismiss
                                </button>
                                <button 
                                    onClick={() => onComplete(eodData.report)}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex justify-center items-center gap-2"
                                >
                                    <FileText className="h-5 w-5" />
                                    Print EOD Report
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
