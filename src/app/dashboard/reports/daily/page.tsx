'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, TrendingUp, Users, CreditCard, Download, Loader2, Printer } from 'lucide-react'

export default function DailyReportPage() {
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/franchise/reports/daily?date=${selectedDate}`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data)
            }
        } catch (error) {
            console.error('Error fetching report:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [selectedDate])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!reportData) return null

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 print:p-0 print:bg-white">
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto; 
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>

            {/* Screen View */}
            <div className="max-w-5xl mx-auto space-y-8 print:hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">End-of-Day Report</h1>
                        <p className="text-gray-500 mt-1">Daily financial summary and performance metrics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium"
                        >
                            <Printer className="h-4 w-4" />
                            Print Receipt
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total Revenue"
                        value={`$${reportData.summary.totalRevenue.toFixed(2)}`}
                        icon={DollarSign}
                        color="blue"
                    />
                    <SummaryCard
                        title="Net Revenue"
                        value={`$${reportData.summary.netRevenue.toFixed(2)}`}
                        subtext={`Tax: $${reportData.summary.totalTax.toFixed(2)} | Tips: $${reportData.summary.totalTips.toFixed(2)}`}
                        icon={TrendingUp}
                        color="green"
                    />
                    <SummaryCard
                        title="Transactions"
                        value={reportData.summary.transactionCount}
                        icon={CreditCard}
                        color="purple"
                    />
                    <SummaryCard
                        title="Avg Ticket"
                        value={`$${reportData.summary.averageTicket.toFixed(2)}`}
                        icon={Users}
                        color="orange"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Hourly Sales Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-6">Hourly Sales Performance</h3>
                        <div className="h-64 flex items-end gap-2">
                            {reportData.hourlySales.map((item: any) => {
                                const maxSales = Math.max(...reportData.hourlySales.map((i: any) => i.sales)) || 1
                                const height = (item.sales / maxSales) * 100
                                return (
                                    <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div
                                            className="w-full bg-blue-100 rounded-t-sm hover:bg-blue-200 transition-colors relative group-hover:shadow-sm"
                                            style={{ height: `${height}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                ${item.sales.toFixed(0)}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 rotate-0 md:rotate-0">{item.hour}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-6">Payment Breakdown</h3>
                        <div className="space-y-4">
                            {Object.entries(reportData.paymentMethods).map(([method, amount]: [string, any]) => (
                                <div key={method} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
                                            <CreditCard className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 capitalize">
                                            {method.replace('_', ' ').toLowerCase()}
                                        </span>
                                    </div>
                                    <span className="font-bold text-gray-900">${Number(amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Top Items */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Top Selling Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-500 border-b border-gray-100">
                                    <tr>
                                        <th className="pb-3 font-medium">Item</th>
                                        <th className="pb-3 font-medium text-right">Qty</th>
                                        <th className="pb-3 font-medium text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reportData.topItems.map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-3 font-medium text-gray-900">{item.name}</td>
                                            <td className="py-3 text-gray-600 text-right">{item.quantity}</td>
                                            <td className="py-3 text-gray-900 text-right font-medium">${item.revenue.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Staff Performance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Staff Performance</h3>
                        <div className="space-y-4">
                            {reportData.staffStats.map((staff: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                                            {staff.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{staff.name}</p>
                                            <p className="text-xs text-gray-500">{staff.count} Transactions</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-900">${staff.sales.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Printer View (Visible only on print) */}
            <div className="hidden print:block w-[80mm] mx-auto p-2">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-black">END OF DAY</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="space-y-4 text-sm">
                    {/* Summary */}
                    <div className="border-b-2 border-black pb-4">
                        <div className="flex justify-between font-bold text-lg mb-2">
                            <span>TOTAL REVENUE</span>
                            <span>${reportData.summary.totalRevenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Net Revenue</span>
                            <span>${reportData.summary.netRevenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Tax</span>
                            <span>${reportData.summary.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Tips</span>
                            <span>${reportData.summary.totalTips.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="border-b border-dashed border-gray-400 pb-4">
                        <div className="flex justify-between">
                            <span>Transactions</span>
                            <span>{reportData.summary.transactionCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Avg Ticket</span>
                            <span>${reportData.summary.averageTicket.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payments */}
                    <div className="border-b border-dashed border-gray-400 pb-4">
                        <h3 className="font-bold mb-2 uppercase">Payments</h3>
                        {Object.entries(reportData.paymentMethods).map(([method, amount]: [string, any]) => (
                            <div key={method} className="flex justify-between">
                                <span className="capitalize">{method.replace('_', ' ').toLowerCase()}</span>
                                <span>${Number(amount).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Top Items */}
                    <div className="border-b border-dashed border-gray-400 pb-4">
                        <h3 className="font-bold mb-2 uppercase">Top Items</h3>
                        {reportData.topItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between mb-1">
                                <span className="truncate flex-1 pr-2">{item.name}</span>
                                <span className="text-gray-600 mr-2">x{item.quantity}</span>
                                <span>${item.revenue.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Staff */}
                    <div className="pb-4">
                        <h3 className="font-bold mb-2 uppercase">Staff Sales</h3>
                        {reportData.staffStats.map((staff: any, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span>{staff.name}</span>
                                <span>${staff.sales.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-black">
                        <p>Printed: {new Date().toLocaleString()}</p>
                        <p>Aura CRM</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ title, value, subtext, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-gray-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtext && (
                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">{subtext}</p>
            )}
        </div>
    )
}
