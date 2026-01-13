'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import {
    ArrowLeft,
    Calendar,
    Loader2,
    AlertTriangle,
    Tag,
    Percent,
    FileDown
} from 'lucide-react'

export default function DiscountAuditPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: getDefaultStartDate(),
        end: new Date().toISOString().split('T')[0]
    })

    function getDefaultStartDate() {
        const now = new Date()
        now.setDate(now.getDate() - 30)
        return now.toISOString().split('T')[0]
    }

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end
            })

            const res = await fetch(`/api/franchise/reports/discount-audit?${params}`)
            if (res.ok) {
                const result = await res.json()
                setData(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
    const formatPercent = (percent: number) => `${percent.toFixed(1)}%`
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

    const exportToPDF = () => {
        if (!data) return

        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Discount & Override Audit Report', 20, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, yPos)
        yPos += 15

        // Summary
        doc.setFont('helvetica', 'bold')
        doc.text('Summary:', 20, yPos)
        yPos += 7
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Transactions: ${data.summary.totalTransactions}`, 25, yPos)
        yPos += 5
        doc.text(`With Discounts: ${data.summary.transactionsWithDiscount} (${formatPercent(data.summary.discountRate)})`, 25, yPos)
        yPos += 5
        doc.text(`Total Discounted: ${formatCurrency(data.summary.totalDiscountAmount)}`, 25, yPos)
        yPos += 5
        doc.text(`Average Discount: ${formatCurrency(data.summary.avgDiscountPerTransaction)}`, 25, yPos)
        yPos += 15

        // Suspicious Discounts
        if (data.suspiciousDiscounts.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Suspicious Discounts (50%+ or >$50):', 20, yPos)
            yPos += 7
            doc.setFont('helvetica', 'normal')
            data.suspiciousDiscounts.slice(0, 10).forEach((tx: any) => {
                if (yPos > 270) {
                    doc.addPage()
                    yPos = 20
                }
                doc.text(`  ${formatDate(tx.date)} - ${tx.barber}: ${formatCurrency(tx.originalAmount)} -> ${formatCurrency(tx.finalAmount)} (-${formatPercent(tx.discountPercent)})`, 20, yPos)
                yPos += 5
            })
            yPos += 10
        }

        // By Barber
        doc.setFont('helvetica', 'bold')
        doc.text('Discounts by Barber:', 20, yPos)
        yPos += 7
        doc.setFont('helvetica', 'normal')
        data.byBarber?.forEach((barber: any) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            doc.text(`  ${barber.name}: ${barber.discountCount} discounts, Total: ${formatCurrency(barber.totalDiscountAmount)}`, 20, yPos)
            yPos += 5
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`discount_audit_${dateRange.start}_${dateRange.end}.pdf`)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
                                <Tag className="w-6 h-6 text-white" />
                            </div>
                            Discount & Override Audit
                        </h1>
                        <p className="text-gray-400 mt-1">Detect discount abuse and price overrides</p>
                    </div>
                </div>

                <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                </button>
            </div>

            {/* Date Range */}
            <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
                            <p className="text-2xl font-bold text-white">{data.summary.totalTransactions}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">With Discounts</p>
                            <p className="text-2xl font-bold text-yellow-400">{data.summary.transactionsWithDiscount}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">Discount Rate</p>
                            <p className="text-2xl font-bold text-white">{formatPercent(data.summary.discountRate)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                            <p className="text-orange-300 text-sm mb-1">Total Discounted</p>
                            <p className="text-2xl font-bold text-orange-400">{formatCurrency(data.summary.totalDiscountAmount)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">Avg Discount</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(data.summary.avgDiscountPerTransaction)}</p>
                        </div>
                    </div>

                    {/* Discount Range Distribution */}
                    <div className="glass-panel rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4">Discount Distribution</h3>
                        <div className="flex gap-2">
                            {Object.entries(data.byDiscountRange).map(([range, count]: [string, any]) => (
                                <div key={range} className="flex-1 text-center">
                                    <div
                                        className={`rounded-lg mx-auto mb-2 ${range.includes('76') || range.includes('51')
                                            ? 'bg-red-500/30'
                                            : 'bg-yellow-500/20'
                                            }`}
                                        style={{
                                            height: `${Math.max(20, count * 15)}px`,
                                            maxHeight: '100px'
                                        }}
                                    />
                                    <p className="text-gray-400 text-xs">{range}</p>
                                    <p className="text-white font-medium">{count}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suspicious Discounts */}
                    {data.suspiciousDiscounts.length > 0 && (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-700 bg-red-500/10">
                                <h3 className="text-red-400 font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Suspicious Discounts
                                </h3>
                                <p className="text-red-300 text-sm">Discounts 50%+ or over $50</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50">
                                    <tr className="text-gray-400">
                                        <th className="text-left px-6 py-3">Date</th>
                                        <th className="text-left px-6 py-3">Barber</th>
                                        <th className="text-right px-6 py-3">Original</th>
                                        <th className="text-right px-6 py-3">Discount</th>
                                        <th className="text-center px-6 py-3">%</th>
                                        <th className="text-right px-6 py-3">Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {data.suspiciousDiscounts.map((tx: any) => (
                                        <tr key={tx.transactionId} className="hover:bg-gray-800/50 bg-red-500/5">
                                            <td className="px-6 py-3 text-gray-300">{formatDate(tx.date)}</td>
                                            <td className="px-6 py-3 text-white">{tx.barber}</td>
                                            <td className="px-6 py-3 text-right text-gray-400 line-through">{formatCurrency(tx.originalAmount)}</td>
                                            <td className="px-6 py-3 text-right text-red-400 font-medium">-{formatCurrency(tx.discountAmount)}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                                    {formatPercent(tx.discountPercent)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-white font-medium">{formatCurrency(tx.finalAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* By Barber */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Discounts by Barber</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/50">
                                <tr className="text-gray-400">
                                    <th className="text-left px-6 py-3">Barber</th>
                                    <th className="text-center px-6 py-3">Discount Count</th>
                                    <th className="text-right px-6 py-3">Total Discounted</th>
                                    <th className="text-right px-6 py-3">Avg Discount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {data.byBarber.map((barber: any) => (
                                    <tr key={barber.id} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {barber.name?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-white">{barber.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center text-yellow-400 font-medium">{barber.discountCount}</td>
                                        <td className="px-6 py-3 text-right text-orange-400 font-medium">{formatCurrency(barber.totalDiscountAmount)}</td>
                                        <td className="px-6 py-3 text-right text-gray-300">{formatCurrency(barber.avgDiscount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    )
}
