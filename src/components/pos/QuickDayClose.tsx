'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, DollarSign, CheckCircle, AlertTriangle, Moon, TrendingUp, TrendingDown, Ticket, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface QuickDayCloseProps {
    onClose: () => void
    onComplete: () => void
}

interface ZReportData {
    summary: {
        totalSales: number
        cashSales: number
        cardSales: number
        totalTransactions: number
    }
    cashReconciliation: {
        opening: number
        sales: number
        lotterySales?: number
        lotteryPayouts?: number
        expected: number
    }
    lottery?: {
        sales: number
        salesCount: number
        payouts: number
        payoutsCount: number
        net: number
    }
}

export default function QuickDayClose({ onClose, onComplete }: QuickDayCloseProps) {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [zReport, setZReport] = useState<ZReportData | null>(null)
    const [success, setSuccess] = useState(false)

    // Quick cash entry - just total amount (or use calculator)
    const [cashInput, setCashInput] = useState('')
    const [useCalculator, setUseCalculator] = useState(false)
    const [drawerCount, setDrawerCount] = useState({
        hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0,
        quarters: 0, dimes: 0, nickels: 0, pennies: 0
    })

    // Variance note
    const [varianceNote, setVarianceNote] = useState('')

    // Fetch Z-Report data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/reports/z-report')
                if (res.ok) {
                    const data = await res.json()
                    setZReport(data)
                }
            } catch (e) {
                console.error('Failed to fetch Z-Report:', e)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    // Calculate counted total
    const countedTotal = useMemo(() => {
        if (useCalculator) {
            return (
                drawerCount.hundreds * 100 + drawerCount.fifties * 50 +
                drawerCount.twenties * 20 + drawerCount.tens * 10 +
                drawerCount.fives * 5 + drawerCount.ones * 1 +
                drawerCount.quarters * 0.25 + drawerCount.dimes * 0.10 +
                drawerCount.nickels * 0.05 + drawerCount.pennies * 0.01
            )
        }
        return parseFloat(cashInput) || 0
    }, [useCalculator, cashInput, drawerCount])

    const expectedCash = zReport?.cashReconciliation.expected || 0
    const variance = countedTotal - expectedCash
    const variancePercent = expectedCash > 0 ? (variance / expectedCash) * 100 : 0
    const hasSignificantVariance = Math.abs(variance) > 5

    // Handle close
    const handleClose = async () => {
        if (hasSignificantVariance && !varianceNote) {
            return // Require note for significant variance
        }

        setSubmitting(true)
        try {
            await fetch('/api/drawer-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'END_OF_DAY',
                    amount: countedTotal,
                    note: `EOD Close - Counted: $${countedTotal.toFixed(2)}${variance !== 0 ? `, Variance: $${variance.toFixed(2)}` : ''}${varianceNote ? ` - ${varianceNote}` : ''}`
                })
            })
            setSuccess(true)
            setTimeout(() => onComplete(), 1500)
        } catch (e) {
            console.error('Failed to close day:', e)
        }
        setSubmitting(false)
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-stone-400">Loading day summary...</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-24 h-24 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-12 w-12 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Day Closed!</h2>
                    <p className="text-stone-400">Have a great night! 🌙</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-4xl border border-stone-700 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0">
                    <div className="flex items-center gap-3">
                        <Moon className="h-6 w-6" />
                        <h2 className="text-xl font-bold">Close Day</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Single Screen Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Left Column: Sales Summary */}
                        <div className="space-y-4">
                            {/* Today's Sales */}
                            <div className="bg-stone-800 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-stone-400 mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Today's Sales
                                </h3>
                                <div className="text-center mb-4">
                                    <p className="text-4xl font-bold text-emerald-400">
                                        {formatCurrency(zReport?.summary.totalSales || 0)}
                                    </p>
                                    <p className="text-stone-500 text-sm mt-1">
                                        {zReport?.summary.totalTransactions || 0} transactions
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-bold text-green-400">{formatCurrency(zReport?.summary.cashSales || 0)}</p>
                                        <p className="text-xs text-stone-500">💵 Cash</p>
                                    </div>
                                    <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                        <p className="text-lg font-bold text-blue-400">{formatCurrency(zReport?.summary.cardSales || 0)}</p>
                                        <p className="text-xs text-stone-500">💳 Card</p>
                                    </div>
                                </div>
                            </div>

                            {/* Lottery Summary (if applicable) */}
                            {zReport?.lottery && (zReport.lottery.sales > 0 || zReport.lottery.payouts > 0) && (
                                <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-5 border border-purple-500/30">
                                    <h3 className="text-sm font-medium text-purple-300 mb-4 flex items-center gap-2">
                                        <Ticket className="h-4 w-4" />
                                        Lottery (Separate Cash)
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-green-400">+{formatCurrency(zReport.lottery.sales)}</p>
                                            <p className="text-xs text-stone-400">{zReport.lottery.salesCount} sold</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-red-400">-{formatCurrency(zReport.lottery.payouts)}</p>
                                            <p className="text-xs text-stone-400">{zReport.lottery.payoutsCount} paid</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-lg font-bold ${zReport.lottery.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {zReport.lottery.net >= 0 ? '+' : ''}{formatCurrency(zReport.lottery.net)}
                                            </p>
                                            <p className="text-xs text-stone-400">net</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Expected Cash */}
                            <div className="bg-stone-800 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-stone-400 mb-3">Expected Cash in Drawer</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-stone-400">
                                        <span>Opening</span>
                                        <span>{formatCurrency(zReport?.cashReconciliation.opening || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-400">
                                        <span>+ Cash Sales</span>
                                        <span>{formatCurrency(zReport?.cashReconciliation.sales || 0)}</span>
                                    </div>
                                    {(zReport?.cashReconciliation.lotterySales ?? 0) > 0 && (
                                        <div className="flex justify-between text-purple-400">
                                            <span>+ Lottery Sales</span>
                                            <span>{formatCurrency(zReport?.cashReconciliation.lotterySales ?? 0)}</span>
                                        </div>
                                    )}
                                    {(zReport?.cashReconciliation.lotteryPayouts ?? 0) > 0 && (
                                        <div className="flex justify-between text-orange-400">
                                            <span>- Lottery Payouts</span>
                                            <span>-{formatCurrency(zReport?.cashReconciliation.lotteryPayouts ?? 0)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-stone-700">
                                        <span>Expected</span>
                                        <span className="text-amber-400">{formatCurrency(expectedCash)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Cash Count & Variance */}
                        <div className="space-y-4">
                            {/* Cash Count Toggle */}
                            <div className="bg-stone-800 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-stone-400 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Enter Counted Cash
                                    </h3>
                                    <button
                                        onClick={() => setUseCalculator(!useCalculator)}
                                        className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1
                                            ${useCalculator ? 'bg-indigo-600' : 'bg-stone-700 hover:bg-stone-600'}`}
                                    >
                                        <Calculator className="h-3 w-3" />
                                        {useCalculator ? 'Using Calculator' : 'Use Calculator'}
                                    </button>
                                </div>

                                {useCalculator ? (
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        {/* Bills */}
                                        <div className="space-y-2">
                                            <p className="text-xs text-stone-500 uppercase">Bills</p>
                                            {[
                                                { key: 'hundreds', label: '$100' },
                                                { key: 'fifties', label: '$50' },
                                                { key: 'twenties', label: '$20' },
                                                { key: 'tens', label: '$10' },
                                                { key: 'fives', label: '$5' },
                                                { key: 'ones', label: '$1' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <span className="w-10 text-xs text-stone-400">{label}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={drawerCount[key as keyof typeof drawerCount] || ''}
                                                        onChange={(e) => setDrawerCount({
                                                            ...drawerCount,
                                                            [key]: parseInt(e.target.value) || 0
                                                        })}
                                                        className="flex-1 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded text-center text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Coins */}
                                        <div className="space-y-2">
                                            <p className="text-xs text-stone-500 uppercase">Coins</p>
                                            {[
                                                { key: 'quarters', label: '25¢' },
                                                { key: 'dimes', label: '10¢' },
                                                { key: 'nickels', label: '5¢' },
                                                { key: 'pennies', label: '1¢' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <span className="w-10 text-xs text-stone-400">{label}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={drawerCount[key as keyof typeof drawerCount] || ''}
                                                        onChange={(e) => setDrawerCount({
                                                            ...drawerCount,
                                                            [key]: parseInt(e.target.value) || 0
                                                        })}
                                                        className="flex-1 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded text-center text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={cashInput}
                                        onChange={(e) => setCashInput(e.target.value.replace(/[^0-9.]/g, ''))}
                                        placeholder="Enter total cash..."
                                        className="w-full text-center text-4xl font-bold px-4 py-6 bg-stone-900 border border-stone-700 rounded-xl focus:outline-none focus:border-indigo-500"
                                        autoFocus
                                    />
                                )}

                                <div className="mt-4 text-center">
                                    <p className="text-stone-500 text-sm">Counted Total</p>
                                    <p className="text-3xl font-bold text-emerald-400">{formatCurrency(countedTotal)}</p>
                                </div>
                            </div>

                            {/* Variance Display */}
                            {countedTotal > 0 && (
                                <div className={`rounded-xl p-5 ${Math.abs(variance) <= 5
                                        ? 'bg-emerald-900/30 border border-emerald-500/30'
                                        : variance > 0
                                            ? 'bg-emerald-900/30 border border-emerald-500/30'
                                            : 'bg-red-900/30 border border-red-500/30'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {Math.abs(variance) <= 5 ? (
                                                <CheckCircle className="h-6 w-6 text-emerald-400" />
                                            ) : variance > 0 ? (
                                                <TrendingUp className="h-6 w-6 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="h-6 w-6 text-red-400" />
                                            )}
                                            <div>
                                                <p className="text-sm text-stone-400">Variance</p>
                                                <p className={`text-2xl font-bold ${Math.abs(variance) <= 5 ? 'text-emerald-400' :
                                                        variance > 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                                </p>
                                            </div>
                                        </div>
                                        {Math.abs(variance) <= 5 && (
                                            <span className="text-emerald-400 text-sm">✓ Within tolerance</span>
                                        )}
                                    </div>

                                    {/* Variance Note (required if > $5) */}
                                    {hasSignificantVariance && (
                                        <div className="mt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                <label className="text-sm font-medium">Reason required:</label>
                                            </div>
                                            <select
                                                value={varianceNote}
                                                onChange={(e) => setVarianceNote(e.target.value)}
                                                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm"
                                            >
                                                <option value="">Select reason...</option>
                                                <option value="Counting error - recounted">Counting error - recounted</option>
                                                <option value="Cash drop not yet recorded">Cash drop not yet recorded</option>
                                                <option value="Change given incorrectly">Change given incorrectly</option>
                                                <option value="Lottery payout discrepancy">Lottery payout discrepancy</option>
                                                <option value="Till shortage - noted">Till shortage - noted</option>
                                                <option value="Other - see note">Other - see note</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-800 shrink-0">
                    <button
                        onClick={handleClose}
                        disabled={submitting || countedTotal === 0 || (hasSignificantVariance && !varianceNote)}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 
                            disabled:from-stone-700 disabled:to-stone-700 disabled:cursor-not-allowed
                            rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Closing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-5 w-5" />
                                Close Day & Print Z-Report
                            </>
                        )}
                    </button>
                    {countedTotal === 0 && (
                        <p className="text-center text-stone-500 text-sm mt-2">Enter your drawer count to continue</p>
                    )}
                </div>
            </div>
        </div>
    )
}
