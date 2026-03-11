'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, PieChart, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PnLReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/pnl?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const rev = data?.revenue || {}
    const exp = data?.expenses || {}
    const profit = data?.profit || {}
    const revenue = rev.grossRevenue || 0
    const refunds = rev.refunds || 0
    const voids = rev.voids || 0
    const netSales = rev.netSales || 0
    const taxCollected = rev.taxCollected || 0
    const laborCost = exp.laborCost || 0
    const grossProfit = profit.grossProfit || 0
    const netProfit = profit.netProfit

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><PieChart className="h-8 w-8 text-purple-500" /> Profit & Loss</h1>
                    <p className="text-stone-400">Revenue, costs, and net profit breakdown</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <div className="max-w-2xl mx-auto bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Today&apos;s P&amp;L</h2>
                    {[
                        { label: 'Gross Revenue', val: revenue, color: 'text-emerald-400', bold: true },
                        { label: '  Less: Refunds', val: -refunds, color: 'text-red-400' },
                        { label: '  Less: Voids', val: -voids, color: 'text-red-400' },
                        { label: 'Net Sales', val: netSales, color: 'text-white', bold: true, border: true },
                        { label: '  Tax Collected', val: taxCollected, color: 'text-blue-400' },
                        { label: 'Gross Profit (pre-expenses)', val: grossProfit, color: 'text-emerald-400', bold: true, border: true },
                        ...(exp.hasLaborData ? [
                            { label: '  Labor Cost', val: -laborCost, color: 'text-orange-400' },
                            { label: 'Net Profit', val: netProfit || 0, color: (netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400', bold: true, border: true },
                        ] : []),
                    ].map((row, i) => (
                        <div key={i} className={`flex justify-between py-2 ${row.border ? 'border-t border-stone-600 mt-2 pt-3' : ''} ${row.bold ? 'font-bold' : ''}`}>
                            <span className={row.bold ? 'text-white' : 'text-stone-400'}>{row.label}</span>
                            <span className={`font-mono ${row.color}`}>{formatCurrency(Math.abs(row.val))}{row.val < 0 ? ' (-)' : ''}</span>
                        </div>
                    ))}
                    <p className="text-xs text-stone-600 mt-4">
                        {exp.hasLaborData
                            ? '* COGS not yet connected. Connect accounting for full P&L.'
                            : '* Connect payroll and accounting for complete expense tracking.'}
                    </p>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No data yet.</p>}
        </div>
    )
}
