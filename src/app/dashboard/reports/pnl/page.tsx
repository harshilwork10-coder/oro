'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, PieChart, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PnLReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/eod-summary')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const revenue = data?.revenue || 0
    const refunds = data?.refunds || 0
    const voids = data?.voids || 0
    const netSales = revenue - refunds - voids
    const estimatedCogs = netSales * 0.35
    const grossProfit = netSales - estimatedCogs
    const estimatedExpenses = netSales * 0.25
    const netProfit = grossProfit - estimatedExpenses

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
                        { label: '  Estimated COGS (35%)', val: -estimatedCogs, color: 'text-orange-400' },
                        { label: 'Gross Profit', val: grossProfit, color: 'text-emerald-400', bold: true, border: true },
                        { label: '  Estimated Operating Expenses (25%)', val: -estimatedExpenses, color: 'text-orange-400' },
                        { label: 'Net Profit', val: netProfit, color: netProfit >= 0 ? 'text-emerald-400' : 'text-red-400', bold: true, border: true },
                    ].map((row, i) => (
                        <div key={i} className={`flex justify-between py-2 ${row.border ? 'border-t border-stone-600 mt-2 pt-3' : ''} ${row.bold ? 'font-bold' : ''}`}>
                            <span className={row.bold ? 'text-white' : 'text-stone-400'}>{row.label}</span>
                            <span className={`font-mono ${row.color}`}>{formatCurrency(Math.abs(row.val))}{row.val < 0 ? ' (-)' : ''}</span>
                        </div>
                    ))}
                    <p className="text-xs text-stone-600 mt-4">* COGS and expenses are estimated. Connect accounting for actuals.</p>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No data yet.</p>}
        </div>
    )
}
