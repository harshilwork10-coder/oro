'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, CheckCircle, AlertTriangle, Printer, Moon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface EndOfDayWizardProps {
    onClose: () => void
    onComplete: () => void
}

type WizardStep = 'count' | 'reconcile' | 'discrepancy' | 'zreport' | 'complete'

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
        actual: number | null
        variance: number
    }
    lottery?: {
        sales: number
        salesCount: number
        payouts: number
        payoutsCount: number
        net: number
    }
    topItems: { name: string; quantity: number; sales: number }[]
    taxSummary: {
        subtotal: number
        tax: number
        total: number
    }
}

export default function EndOfDayWizard({ onClose, onComplete }: EndOfDayWizardProps) {
    const [step, setStep] = useState<WizardStep>('count')
    const [loading, setLoading] = useState(false)
    const [zReport, setZReport] = useState<ZReportData | null>(null)

    // Drawer count state
    const [drawerCount, setDrawerCount] = useState({
        hundreds: 0,
        fifties: 0,
        twenties: 0,
        tens: 0,
        fives: 0,
        ones: 0,
        quarters: 0,
        dimes: 0,
        nickels: 0,
        pennies: 0
    })
    const [discrepancyNote, setDiscrepancyNote] = useState('')

    // Calculate total from drawer count
    const calculateTotal = () => {
        return (
            drawerCount.hundreds * 100 +
            drawerCount.fifties * 50 +
            drawerCount.twenties * 20 +
            drawerCount.tens * 10 +
            drawerCount.fives * 5 +
            drawerCount.ones * 1 +
            drawerCount.quarters * 0.25 +
            drawerCount.dimes * 0.10 +
            drawerCount.nickels * 0.05 +
            drawerCount.pennies * 0.01
        )
    }

    const countedTotal = calculateTotal()
    const variance = zReport ? countedTotal - zReport.cashReconciliation.expected : 0

    // Fetch Z-Report data
    useEffect(() => {
        fetchZReport()
    }, [])

    const fetchZReport = async () => {
        try {
            const res = await fetch('/api/reports/z-report')
            if (res.ok) {
                const data = await res.json()
                setZReport(data)
            }
        } catch (e) {
            console.error('Failed to fetch Z-Report:', e)
        }
    }

    const handleCountSubmit = () => {
        if (zReport) {
            // If variance > $5, require explanation
            if (Math.abs(variance) > 5) {
                setStep('discrepancy')
            } else {
                setStep('zreport')
            }
        }
    }

    const handleFinalize = async () => {
        setLoading(true)
        try {
            // Record the end of day close
            await fetch('/api/drawer-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'END_OF_DAY',
                    amount: countedTotal,
                    note: `EOD Close - Counted: $${countedTotal.toFixed(2)}${variance !== 0 ? `, Variance: $${variance.toFixed(2)}` : ''}${discrepancyNote ? ` - ${discrepancyNote}` : ''}`
                })
            })
            setStep('complete')
        } catch (e) {
            console.error('Failed to close day:', e)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-2xl border border-stone-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <Moon className="h-6 w-6" />
                        <h2 className="text-xl font-bold">End of Day Wizard</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 p-4 bg-stone-950/50">
                    {['count', 'reconcile', 'zreport', 'complete'].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${step === s ? 'bg-indigo-600 text-white' :
                                    ['count', 'reconcile', 'discrepancy', 'zreport', 'complete'].indexOf(step) > i
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-stone-800 text-stone-500'}`}>
                                {['count', 'reconcile', 'discrepancy', 'zreport', 'complete'].indexOf(step) > i ? '✓' : i + 1}
                            </div>
                            {i < 3 && <div className="w-8 h-0.5 bg-stone-700" />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {step === 'count' && (
                        <div>
                            <h3 className="text-lg font-bold mb-4">💵 Count Your Drawer</h3>
                            <p className="text-stone-400 mb-6">Enter the quantity of each denomination:</p>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Bills */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-stone-400">Bills</h4>
                                    {[
                                        { key: 'hundreds', label: '$100', value: 100 },
                                        { key: 'fifties', label: '$50', value: 50 },
                                        { key: 'twenties', label: '$20', value: 20 },
                                        { key: 'tens', label: '$10', value: 10 },
                                        { key: 'fives', label: '$5', value: 5 },
                                        { key: 'ones', label: '$1', value: 1 }
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="w-12 text-sm font-medium">{label}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={drawerCount[key as keyof typeof drawerCount] || ''}
                                                onChange={(e) => setDrawerCount({
                                                    ...drawerCount,
                                                    [key]: parseInt(e.target.value) || 0
                                                })}
                                                className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-center"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Coins */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-stone-400">Coins</h4>
                                    {[
                                        { key: 'quarters', label: '25¢' },
                                        { key: 'dimes', label: '10¢' },
                                        { key: 'nickels', label: '5¢' },
                                        { key: 'pennies', label: '1¢' }
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="w-12 text-sm font-medium">{label}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={drawerCount[key as keyof typeof drawerCount] || ''}
                                                onChange={(e) => setDrawerCount({
                                                    ...drawerCount,
                                                    [key]: parseInt(e.target.value) || 0
                                                })}
                                                className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="mt-6 p-4 bg-stone-800 rounded-xl text-center">
                                <p className="text-stone-400 text-sm">Counted Total</p>
                                <p className="text-4xl font-bold text-emerald-400">{formatCurrency(countedTotal)}</p>
                            </div>
                        </div>
                    )}

                    {step === 'discrepancy' && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="h-8 w-8 text-amber-500" />
                                <div>
                                    <h3 className="text-lg font-bold">Variance Detected</h3>
                                    <p className="text-stone-400">Please explain the discrepancy</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-stone-800 rounded-xl p-4 text-center">
                                    <p className="text-xs text-stone-500 mb-1">Expected</p>
                                    <p className="text-xl font-bold">{formatCurrency(zReport?.cashReconciliation.expected || 0)}</p>
                                </div>
                                <div className="bg-stone-800 rounded-xl p-4 text-center">
                                    <p className="text-xs text-stone-500 mb-1">Counted</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(countedTotal)}</p>
                                </div>
                                <div className={`rounded-xl p-4 text-center ${variance > 0 ? 'bg-emerald-600/20' : 'bg-red-600/20'}`}>
                                    <p className="text-xs text-stone-500 mb-1">Variance</p>
                                    <p className={`text-xl font-bold ${variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Reason for variance:</label>
                                <select
                                    value={discrepancyNote.split(' - ')[0] || ''}
                                    onChange={(e) => setDiscrepancyNote(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg mb-3"
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Counting error">Counting error</option>
                                    <option value="Cash drop not recorded">Cash drop not recorded</option>
                                    <option value="Register shortage">Register shortage</option>
                                    <option value="Coins uncounted">Coins uncounted</option>
                                    <option value="Other">Other</option>
                                </select>
                                <textarea
                                    value={discrepancyNote.includes(' - ') ? discrepancyNote.split(' - ')[1] : ''}
                                    onChange={(e) => {
                                        const reason = discrepancyNote.split(' - ')[0] || 'Other'
                                        setDiscrepancyNote(e.target.value ? `${reason} - ${e.target.value}` : reason)
                                    }}
                                    placeholder="Additional notes..."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg"
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'zreport' && zReport && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <Printer className="h-6 w-6 text-blue-400" />
                                <h3 className="text-lg font-bold">Z-Report Summary</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Sales Summary */}
                                <div className="bg-stone-800 rounded-xl p-4">
                                    <h4 className="text-sm font-medium text-stone-400 mb-3">Sales Summary</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(zReport.summary.totalSales)}</p>
                                            <p className="text-xs text-stone-500">Total Sales</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-400">{formatCurrency(zReport.summary.cashSales)}</p>
                                            <p className="text-xs text-stone-500">Cash</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-400">{formatCurrency(zReport.summary.cardSales)}</p>
                                            <p className="text-xs text-stone-500">Card</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cash Reconciliation */}
                                <div className="bg-stone-800 rounded-xl p-4">
                                    <h4 className="text-sm font-medium text-stone-400 mb-3">Cash Reconciliation</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-stone-400">Opening Cash</span>
                                            <span>{formatCurrency(zReport.cashReconciliation.opening)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-400">+ Cash Sales</span>
                                            <span>{formatCurrency(zReport.cashReconciliation.sales)}</span>
                                        </div>
                                        {(zReport.cashReconciliation.lotterySales ?? 0) > 0 && (
                                            <div className="flex justify-between text-purple-400">
                                                <span>+ Lottery Ticket Sales</span>
                                                <span>{formatCurrency(zReport.cashReconciliation.lotterySales ?? 0)}</span>
                                            </div>
                                        )}
                                        {(zReport.cashReconciliation.lotteryPayouts ?? 0) > 0 && (
                                            <div className="flex justify-between text-orange-400">
                                                <span>- Lottery Payouts</span>
                                                <span>-{formatCurrency(zReport.cashReconciliation.lotteryPayouts ?? 0)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold border-t border-stone-700 pt-2">
                                            <span>Expected Cash</span>
                                            <span>{formatCurrency(zReport.cashReconciliation.expected)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-emerald-400">
                                            <span>Counted Cash</span>
                                            <span>{formatCurrency(countedTotal)}</span>
                                        </div>
                                        {variance !== 0 && (
                                            <div className={`flex justify-between font-bold ${variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                <span>Variance</span>
                                                <span>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction Count */}
                                <div className="bg-stone-800 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold">{zReport.summary.totalTransactions}</p>
                                    <p className="text-sm text-stone-400">Total Transactions Today</p>
                                </div>

                                {/* Lottery Summary */}
                                {zReport.lottery && (zReport.lottery.sales > 0 || zReport.lottery.payouts > 0) && (
                                    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-4 border border-purple-500/30">
                                        <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                                            🎰 Lottery Summary (Separate Accounting)
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-green-400">+{formatCurrency(zReport.lottery.sales)}</p>
                                                <p className="text-xs text-stone-400">{zReport.lottery.salesCount} Tickets Sold</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-red-400">-{formatCurrency(zReport.lottery.payouts)}</p>
                                                <p className="text-xs text-stone-400">{zReport.lottery.payoutsCount} Payouts</p>
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-xl font-bold ${zReport.lottery.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {zReport.lottery.net >= 0 ? '+' : ''}{formatCurrency(zReport.lottery.net)}
                                                </p>
                                                <p className="text-xs text-stone-400">Net Lottery</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-purple-400/70 mt-3 text-center">Not included in Total Sales (pass-through, non-taxable)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="h-10 w-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Day Closed Successfully!</h3>
                            <p className="text-stone-400 mb-6">All reports have been recorded. Have a great night!</p>
                            <div className="bg-stone-800 rounded-xl p-4 inline-block">
                                <p className="text-sm text-stone-400">Final Drawer Count</p>
                                <p className="text-3xl font-bold text-emerald-400">{formatCurrency(countedTotal)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-800 flex justify-between">
                    {step !== 'complete' && step !== 'count' && (
                        <button
                            onClick={() => {
                                if (step === 'discrepancy') setStep('count')
                                else if (step === 'zreport') setStep(Math.abs(variance) > 5 ? 'discrepancy' : 'count')
                            }}
                            className="px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium"
                        >
                            Back
                        </button>
                    )}
                    {step === 'count' && <div />}

                    {step === 'count' && (
                        <button
                            onClick={handleCountSubmit}
                            disabled={countedTotal === 0}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold"
                        >
                            Next: Review →
                        </button>
                    )}

                    {step === 'discrepancy' && (
                        <button
                            onClick={() => setStep('zreport')}
                            disabled={!discrepancyNote}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold"
                        >
                            Continue →
                        </button>
                    )}

                    {step === 'zreport' && (
                        <button
                            onClick={handleFinalize}
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-bold"
                        >
                            {loading ? 'Closing...' : '✓ Close Day'}
                        </button>
                    )}

                    {step === 'complete' && (
                        <button
                            onClick={onComplete}
                            className="w-full px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
