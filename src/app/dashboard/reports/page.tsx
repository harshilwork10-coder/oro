'use client'

import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    FileText,
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Clock,
    Download,
    X,
    Calendar,
    CreditCard,
    Receipt,
    Gift,
    Percent,
    Package,
    UserCheck,
    AlertTriangle,
    Printer,
    Eye,
    ChevronRight,
    Loader2
} from "lucide-react"

// Report card types
type ReportType = 'daily-sales' | 'weekly-summary' | 'labor' | 'tips' | 'tax' | 'inventory' | 'customers' | 'gift-cards' | 'refunds' | 'payroll'

interface ReportCard {
    id: ReportType
    title: string
    description: string
    icon: any
    color: string
    quickStat: string
    quickStatLabel: string
    trend?: number
    period: string
}

const REPORT_CARDS: ReportCard[] = [
    {
        id: 'daily-sales',
        title: 'Daily Sales Report',
        description: 'Revenue, transactions, payment breakdown',
        icon: DollarSign,
        color: 'emerald',
        quickStat: '$0',
        quickStatLabel: "Today's Revenue",
        period: 'Today'
    },
    {
        id: 'weekly-summary',
        title: 'Weekly Summary',
        description: 'Week over week comparison & trends',
        icon: BarChart3,
        color: 'blue',
        quickStat: '$0',
        quickStatLabel: 'This Week',
        period: 'This Week'
    },
    {
        id: 'labor',
        title: 'Labor Cost Report',
        description: 'Staff hours, wages, labor percentage',
        icon: Users,
        color: 'purple',
        quickStat: '0%',
        quickStatLabel: 'Labor %',
        period: 'This Period'
    },
    {
        id: 'tips',
        title: 'Tips Report',
        description: 'Tip distribution by employee',
        icon: Percent,
        color: 'amber',
        quickStat: '$0',
        quickStatLabel: 'Total Tips',
        period: 'Today'
    },
    {
        id: 'tax',
        title: 'Tax Summary',
        description: 'Sales tax collected for filing',
        icon: Receipt,
        color: 'red',
        quickStat: '$0',
        quickStatLabel: 'Tax Collected',
        period: 'This Month'
    },
    {
        id: 'inventory',
        title: 'Inventory Report',
        description: 'Stock levels & low stock alerts',
        icon: Package,
        color: 'cyan',
        quickStat: '0',
        quickStatLabel: 'Low Stock Items',
        period: 'Current'
    },
    {
        id: 'customers',
        title: 'Customer Report',
        description: 'New vs returning, top spenders',
        icon: UserCheck,
        color: 'pink',
        quickStat: '0',
        quickStatLabel: 'New Customers',
        period: 'This Month'
    },
    {
        id: 'gift-cards',
        title: 'Gift Card Report',
        description: 'Sold, redeemed, outstanding balance',
        icon: Gift,
        color: 'orange',
        quickStat: '$0',
        quickStatLabel: 'Outstanding',
        period: 'All Time'
    },
    {
        id: 'refunds',
        title: 'Refunds & Voids',
        description: 'Voided transactions & refunds issued',
        icon: AlertTriangle,
        color: 'rose',
        quickStat: '$0',
        quickStatLabel: 'Total Refunds',
        period: 'This Month'
    },
    {
        id: 'payroll',
        title: 'Payroll Summary',
        description: 'Employee hours for payroll processing',
        icon: CreditCard,
        color: 'indigo',
        quickStat: '$0',
        quickStatLabel: 'Total Payroll',
        period: 'This Pay Period'
    }
]

export default function ReportsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [cards, setCards] = useState(REPORT_CARDS)

    // Fetch quick stats for cards
    useEffect(() => {
        fetchQuickStats()
    }, [])

    const fetchQuickStats = async () => {
        try {
            // Fetch daily sales for the quick stat
            const dailyRes = await fetch(`/api/franchise/reports/daily?date=${new Date().toISOString().split('T')[0]}`)
            if (dailyRes.ok) {
                const data = await dailyRes.json()
                setCards(prev => prev.map(card => {
                    if (card.id === 'daily-sales') {
                        return { ...card, quickStat: `$${(data.summary?.totalRevenue || 0).toFixed(0)}`, trend: 5.2 }
                    }
                    if (card.id === 'tips') {
                        return { ...card, quickStat: `$${(data.summary?.totalTips || 0).toFixed(0)}` }
                    }
                    if (card.id === 'tax') {
                        return { ...card, quickStat: `$${(data.summary?.totalTax || 0).toFixed(0)}` }
                    }
                    return card
                }))
            }
        } catch (error) {
            console.error('Failed to fetch quick stats:', error)
        }
    }

    const openReport = async (reportId: ReportType) => {
        setSelectedReport(reportId)
        setLoading(true)

        try {
            // Fetch report data based on type
            let data: any = null

            switch (reportId) {
                case 'daily-sales':
                    const dailyRes = await fetch(`/api/franchise/reports/daily?date=${new Date().toISOString().split('T')[0]}`)
                    if (dailyRes.ok) data = await dailyRes.json()
                    break
                case 'weekly-summary':
                    // Mock weekly data
                    data = {
                        totalRevenue: 12450.00,
                        transactions: 287,
                        avgTicket: 43.38,
                        vsLastWeek: 8.5,
                        dailyBreakdown: [
                            { day: 'Mon', sales: 1650 },
                            { day: 'Tue', sales: 1820 },
                            { day: 'Wed', sales: 1540 },
                            { day: 'Thu', sales: 2100 },
                            { day: 'Fri', sales: 2450 },
                            { day: 'Sat', sales: 2890 },
                            { day: 'Sun', sales: 0 }
                        ]
                    }
                    break
                case 'labor':
                    data = {
                        totalHours: 245,
                        totalWages: 4287.50,
                        laborPercent: 28.5,
                        employees: [
                            { name: 'John Smith', hours: 42, wages: 840.00 },
                            { name: 'Sarah Johnson', hours: 38, wages: 760.00 },
                            { name: 'Mike Davis', hours: 40, wages: 720.00 },
                            { name: 'Emily Chen', hours: 35, wages: 612.50 }
                        ]
                    }
                    break
                case 'tips':
                    data = {
                        totalTips: 856.50,
                        tipPercent: 18.2,
                        employees: [
                            { name: 'John Smith', tips: 245.00, transactions: 42 },
                            { name: 'Sarah Johnson', tips: 312.50, transactions: 38 },
                            { name: 'Mike Davis', tips: 198.00, transactions: 35 },
                            { name: 'Emily Chen', tips: 101.00, transactions: 28 }
                        ]
                    }
                    break
                case 'tax':
                    data = {
                        totalTaxCollected: 1245.87,
                        salesTax: 1145.87,
                        otherTax: 100.00,
                        taxableRevenue: 14323.50,
                        exemptRevenue: 850.00
                    }
                    break
                case 'inventory':
                    data = {
                        totalItems: 145,
                        lowStock: 8,
                        outOfStock: 2,
                        inventoryValue: 8450.00,
                        lowStockItems: [
                            { name: 'Shampoo - Professional', stock: 3, reorder: 10 },
                            { name: 'Hair Color - Brown', stock: 2, reorder: 8 },
                            { name: 'Styling Gel', stock: 5, reorder: 15 }
                        ]
                    }
                    break
                case 'customers':
                    data = {
                        totalCustomers: 1250,
                        newThisMonth: 45,
                        returning: 85,
                        avgSpend: 65.50,
                        topCustomers: [
                            { name: 'Jennifer Lopez', visits: 12, spent: 1450.00 },
                            { name: 'Robert Johnson', visits: 8, spent: 920.00 },
                            { name: 'Maria Garcia', visits: 6, spent: 780.00 }
                        ]
                    }
                    break
                case 'gift-cards':
                    data = {
                        sold: 24,
                        soldAmount: 2400.00,
                        redeemed: 18,
                        redeemedAmount: 1650.00,
                        outstanding: 750.00
                    }
                    break
                case 'refunds':
                    data = {
                        totalRefunds: 3,
                        refundAmount: 245.00,
                        voids: 5,
                        voidAmount: 125.00,
                        refundsList: [
                            { date: '2024-12-04', amount: 85.00, reason: 'Service not completed', employee: 'John Smith' },
                            { date: '2024-12-03', amount: 120.00, reason: 'Customer complaint', employee: 'Sarah Johnson' },
                            { date: '2024-12-02', amount: 40.00, reason: 'Wrong service', employee: 'Mike Davis' }
                        ]
                    }
                    break
                case 'payroll':
                    data = {
                        periodStart: '2024-11-25',
                        periodEnd: '2024-12-08',
                        totalHours: 485,
                        totalGross: 9245.00,
                        employees: [
                            { name: 'John Smith', hours: 80, rate: 20.00, gross: 1600.00 },
                            { name: 'Sarah Johnson', hours: 76, rate: 20.00, gross: 1520.00 },
                            { name: 'Mike Davis', hours: 80, rate: 18.00, gross: 1440.00 },
                            { name: 'Emily Chen', hours: 72, rate: 17.50, gross: 1260.00 }
                        ]
                    }
                    break
            }

            setReportData(data)
        } catch (error) {
            console.error('Failed to fetch report:', error)
        } finally {
            setLoading(false)
        }
    }

    const closeReport = () => {
        setSelectedReport(null)
        setReportData(null)
    }

    const handleDownload = () => {
        // Generate CSV or PDF download
        alert('Download feature coming soon!')
    }

    const handlePrint = () => {
        window.print()
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const colorClasses: Record<string, { bg: string, text: string, border: string }> = {
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
        red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
        cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
        pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
        orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' }
    }

    return (
        <div className="p-4 md:p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <FileText className="h-8 w-8 text-orange-500" />
                    Reports Center
                </h1>
                <p className="text-stone-400 mt-2">Click any report to view instantly • Download or print anytime</p>
            </div>

            {/* Report Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cards.map(card => {
                    const colors = colorClasses[card.color] || colorClasses.emerald
                    const Icon = card.icon

                    return (
                        <div
                            key={card.id}
                            onClick={() => openReport(card.id)}
                            className={`glass-panel p-5 rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-200 border-l-4 ${colors.border} group`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${colors.bg}`}>
                                    <Icon className={`h-5 w-5 ${colors.text}`} />
                                </div>
                                <span className="text-xs text-stone-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {card.period}
                                </span>
                            </div>

                            {/* Title & Description */}
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-sm text-stone-500 mb-4">{card.description}</p>

                            {/* Quick Stat */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-white">{card.quickStat}</p>
                                    <p className="text-xs text-stone-500">{card.quickStatLabel}</p>
                                </div>
                                {card.trend !== undefined && (
                                    <div className={`flex items-center text-sm font-medium ${card.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {card.trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                                        {Math.abs(card.trend)}%
                                    </div>
                                )}
                            </div>

                            {/* View Button */}
                            <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                                <span className="text-sm text-orange-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                    <Eye className="h-4 w-4" />
                                    View Report
                                </span>
                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-orange-400 transition-colors" />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Report Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-stone-900 rounded-2xl border border-stone-700">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-stone-900 border-b border-stone-700 p-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-white">
                                {cards.find(c => c.id === selectedReport)?.title}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </button>
                                <button
                                    onClick={closeReport}
                                    className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                                </div>
                            ) : (
                                <ReportContent type={selectedReport} data={reportData} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Report Content Component
function ReportContent({ type, data }: { type: ReportType; data: any }) {
    if (!data) {
        return <div className="text-center text-stone-500 py-10">No data available</div>
    }

    switch (type) {
        case 'daily-sales':
            return (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Revenue" value={`$${(data.summary?.totalRevenue || 0).toFixed(2)}`} />
                        <StatCard label="Net Revenue" value={`$${(data.summary?.netRevenue || 0).toFixed(2)}`} />
                        <StatCard label="Transactions" value={data.summary?.transactionCount || 0} />
                        <StatCard label="Avg Ticket" value={`$${(data.summary?.averageTicket || 0).toFixed(2)}`} />
                    </div>

                    {/* Payment Methods */}
                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Payment Breakdown</h4>
                        <div className="space-y-2">
                            {data.paymentMethods && Object.entries(data.paymentMethods).map(([method, amount]: [string, any]) => (
                                <div key={method} className="flex justify-between p-2 bg-stone-800 rounded-lg">
                                    <span className="text-stone-300 capitalize">{method.replace('_', ' ')}</span>
                                    <span className="text-white font-medium">${Number(amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Items */}
                    {data.topItems && (
                        <div className="glass-panel p-4 rounded-xl">
                            <h4 className="font-bold text-white mb-4">Top Selling Items</h4>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-stone-500 text-sm border-b border-stone-700">
                                        <th className="text-left pb-2">Item</th>
                                        <th className="text-right pb-2">Qty</th>
                                        <th className="text-right pb-2">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topItems.map((item: any, i: number) => (
                                        <tr key={i} className="border-b border-stone-800">
                                            <td className="py-2 text-white">{item.name}</td>
                                            <td className="py-2 text-stone-400 text-right">{item.quantity}</td>
                                            <td className="py-2 text-emerald-400 text-right font-medium">${item.revenue.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )

        case 'weekly-summary':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Revenue" value={`$${data.totalRevenue?.toFixed(2)}`} />
                        <StatCard label="Transactions" value={data.transactions} />
                        <StatCard label="Avg Ticket" value={`$${data.avgTicket?.toFixed(2)}`} />
                        <StatCard label="vs Last Week" value={`+${data.vsLastWeek}%`} positive />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Daily Breakdown</h4>
                        <div className="flex items-end gap-3 h-48">
                            {data.dailyBreakdown?.map((day: any) => {
                                const max = Math.max(...data.dailyBreakdown.map((d: any) => d.sales))
                                const height = max > 0 ? (day.sales / max) * 100 : 0
                                return (
                                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-orange-500/50 hover:bg-orange-500/70 rounded-t-sm transition-colors"
                                            style={{ height: `${height}%` }}
                                        />
                                        <span className="text-xs text-stone-400">{day.day}</span>
                                        <span className="text-xs text-stone-500">${day.sales}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )

        case 'labor':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard label="Total Hours" value={data.totalHours} />
                        <StatCard label="Total Wages" value={`$${data.totalWages?.toFixed(2)}`} />
                        <StatCard label="Labor %" value={`${data.laborPercent}%`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">By Employee</h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Employee</th>
                                    <th className="text-right pb-2">Hours</th>
                                    <th className="text-right pb-2">Wages</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employees?.map((emp: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-white">{emp.name}</td>
                                        <td className="py-2 text-stone-400 text-right">{emp.hours}h</td>
                                        <td className="py-2 text-emerald-400 text-right font-medium">${emp.wages.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        case 'tips':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Total Tips" value={`$${data.totalTips?.toFixed(2)}`} />
                        <StatCard label="Avg Tip %" value={`${data.tipPercent}%`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Tips by Employee</h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Employee</th>
                                    <th className="text-right pb-2">Transactions</th>
                                    <th className="text-right pb-2">Tips</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employees?.map((emp: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-white">{emp.name}</td>
                                        <td className="py-2 text-stone-400 text-right">{emp.transactions}</td>
                                        <td className="py-2 text-amber-400 text-right font-medium">${emp.tips.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        case 'tax':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Tax Collected" value={`$${data.totalTaxCollected?.toFixed(2)}`} />
                        <StatCard label="Sales Tax" value={`$${data.salesTax?.toFixed(2)}`} />
                        <StatCard label="Taxable Revenue" value={`$${data.taxableRevenue?.toFixed(2)}`} />
                        <StatCard label="Exempt Revenue" value={`$${data.exemptRevenue?.toFixed(2)}`} />
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-red-400 font-medium">📋 Remember to file your sales tax by the 20th of each month</p>
                    </div>
                </div>
            )

        case 'inventory':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Items" value={data.totalItems} />
                        <StatCard label="Low Stock" value={data.lowStock} warning />
                        <StatCard label="Out of Stock" value={data.outOfStock} danger />
                        <StatCard label="Inventory Value" value={`$${data.inventoryValue?.toFixed(2)}`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            Low Stock Alerts
                        </h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Item</th>
                                    <th className="text-right pb-2">Current</th>
                                    <th className="text-right pb-2">Reorder At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.lowStockItems?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-white">{item.name}</td>
                                        <td className="py-2 text-amber-400 text-right font-medium">{item.stock}</td>
                                        <td className="py-2 text-stone-400 text-right">{item.reorder}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        case 'customers':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Customers" value={data.totalCustomers} />
                        <StatCard label="New This Month" value={data.newThisMonth} positive />
                        <StatCard label="Returning" value={`${data.returning}%`} />
                        <StatCard label="Avg Spend" value={`$${data.avgSpend?.toFixed(2)}`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Top Customers</h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Customer</th>
                                    <th className="text-right pb-2">Visits</th>
                                    <th className="text-right pb-2">Total Spent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topCustomers?.map((cust: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-white">{cust.name}</td>
                                        <td className="py-2 text-stone-400 text-right">{cust.visits}</td>
                                        <td className="py-2 text-emerald-400 text-right font-medium">${cust.spent.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        case 'gift-cards':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatCard label="Sold" value={`${data.sold} ($${data.soldAmount?.toFixed(2)})`} />
                        <StatCard label="Redeemed" value={`${data.redeemed} ($${data.redeemedAmount?.toFixed(2)})`} />
                        <StatCard label="Outstanding Balance" value={`$${data.outstanding?.toFixed(2)}`} />
                    </div>

                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                        <p className="text-orange-400 font-medium">💡 Outstanding gift card balance is a liability on your books</p>
                    </div>
                </div>
            )

        case 'refunds':
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Refunds" value={data.totalRefunds} />
                        <StatCard label="Refund Amount" value={`$${data.refundAmount?.toFixed(2)}`} danger />
                        <StatCard label="Voids" value={data.voids} />
                        <StatCard label="Void Amount" value={`$${data.voidAmount?.toFixed(2)}`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Recent Refunds</h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Date</th>
                                    <th className="text-left pb-2">Reason</th>
                                    <th className="text-left pb-2">Employee</th>
                                    <th className="text-right pb-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.refundsList?.map((ref: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-stone-400">{ref.date}</td>
                                        <td className="py-2 text-white">{ref.reason}</td>
                                        <td className="py-2 text-stone-400">{ref.employee}</td>
                                        <td className="py-2 text-rose-400 text-right font-medium">-${ref.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        case 'payroll':
            return (
                <div className="space-y-6">
                    <div className="p-4 bg-stone-800 rounded-xl flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-indigo-400" />
                        <span className="text-white">Pay Period: {data.periodStart} to {data.periodEnd}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Total Hours" value={data.totalHours} />
                        <StatCard label="Total Gross Pay" value={`$${data.totalGross?.toFixed(2)}`} />
                    </div>

                    <div className="glass-panel p-4 rounded-xl">
                        <h4 className="font-bold text-white mb-4">Payroll Details</h4>
                        <table className="w-full">
                            <thead>
                                <tr className="text-stone-500 text-sm border-b border-stone-700">
                                    <th className="text-left pb-2">Employee</th>
                                    <th className="text-right pb-2">Hours</th>
                                    <th className="text-right pb-2">Rate</th>
                                    <th className="text-right pb-2">Gross</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employees?.map((emp: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-2 text-white">{emp.name}</td>
                                        <td className="py-2 text-stone-400 text-right">{emp.hours}h</td>
                                        <td className="py-2 text-stone-400 text-right">${emp.rate.toFixed(2)}/hr</td>
                                        <td className="py-2 text-indigo-400 text-right font-medium">${emp.gross.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )

        default:
            return <div className="text-stone-500">Report not found</div>
    }
}

// Stat Card Component
function StatCard({
    label,
    value,
    positive,
    warning,
    danger
}: {
    label: string
    value: string | number
    positive?: boolean
    warning?: boolean
    danger?: boolean
}) {
    let valueColor = 'text-white'
    if (positive) valueColor = 'text-emerald-400'
    if (warning) valueColor = 'text-amber-400'
    if (danger) valueColor = 'text-rose-400'

    return (
        <div className="glass-panel p-4 rounded-xl">
            <p className="text-sm text-stone-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
    )
}
