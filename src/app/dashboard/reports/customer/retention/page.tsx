'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import {
    ArrowLeft,
    Calendar,
    Loader2,
    Users,
    UserPlus,
    UserCheck,
    TrendingUp,
    FileDown,
    Heart
} from 'lucide-react'

export default function RetentionReportPage() {
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

            const res = await fetch(`/api/franchise/reports/retention?${params}`)
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

    const exportToPDF = () => {
        if (!data) return

        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Client Retention Report', 20, yPos)
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
        doc.text(`Total Clients: ${data.summary.totalClients}`, 25, yPos)
        yPos += 5
        doc.text(`New Clients: ${data.summary.newClients}`, 25, yPos)
        yPos += 5
        doc.text(`Returning Clients: ${data.summary.returningClients}`, 25, yPos)
        yPos += 5
        doc.text(`Retention Rate: ${formatPercent(data.summary.retentionRate)}`, 25, yPos)
        yPos += 5
        doc.text(`Avg Days Between Visits: ${data.summary.avgDaysBetweenVisits.toFixed(1)} days`, 25, yPos)
        yPos += 15

        // Top Clients
        if (data.topClients?.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Top Returning Clients:', 20, yPos)
            yPos += 7
            doc.setFont('helvetica', 'normal')
            data.topClients.slice(0, 10).forEach((client: any) => {
                if (yPos > 270) {
                    doc.addPage()
                    yPos = 20
                }
                doc.text(`  ${client.name}: ${client.visitCount} visits, ${formatCurrency(client.totalSpent)} spent`, 20, yPos)
                yPos += 5
            })
            yPos += 10
        }

        // By Barber
        doc.setFont('helvetica', 'bold')
        doc.text('Retention by Barber:', 20, yPos)
        yPos += 7
        doc.setFont('helvetica', 'normal')
        data.barbers?.forEach((barber: any) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            doc.text(`  ${barber.name}: ${barber.totalClients} clients (${barber.newClients} new, ${barber.returningClients} returning) - ${formatPercent(barber.retentionRate)} retention`, 20, yPos)
            yPos += 5
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`retention_report_${dateRange.start}_${dateRange.end}.pdf`)
    }

    const exportCSV = () => {
        if (!data) return

        const summaryHeader = ['Category', 'Value']
        const summaryRows = [
            ['Total Clients', data.summary.totalClients],
            ['New Clients', data.summary.newClients],
            ['Returning Clients', data.summary.returningClients],
            ['Retention Rate', `${data.summary.retentionRate}%`],
            ['Avg Days Between Visits', data.summary.avgDaysBetweenVisits.toFixed(1)]
        ]

        const barberHeader = ['Barber', 'Total Clients', 'New', 'Returning', 'Retention Rate', 'Revenue']
        const barberRows = data.barbers?.map((b: any) => [
            `"${b.name}"`,
            b.totalClients,
            b.newClients,
            b.returningClients,
            `${b.retentionRate}%`,
            b.revenue
        ]) || []

        const clientHeader = ['Client', 'Visits', 'Total Spent', 'Preferred Barber']
        const clientRows = data.topClients?.map((c: any) => [
            `"${c.name}"`,
            c.visitCount,
            c.totalSpent,
            `"${c.preferredBarber || ''}"`
        ]) || []

        const csvContent = [
            'SUMMARY',
            summaryHeader.join(','),
            ...summaryRows.map(r => r.join(',')),
            '',
            'RETENTION BY BARBER',
            barberHeader.join(','),
            ...barberRows.map(r => r.join(',')),
            '',
            'TOP RETURNING CLIENTS',
            clientHeader.join(','),
            ...clientRows.map(r => r.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `retention_report_${dateRange.start}_${dateRange.end}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
                                <Heart className="w-6 h-6 text-white" />
                            </div>
                            Client Retention Report
                        </h1>
                        <p className="text-gray-400 mt-1">Track returning clients and rebooking rates</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        Excel
                    </button>
                </div>
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
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">Total Clients</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{data.summary.totalClients}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <div className="flex items-center gap-2 text-green-300 mb-2">
                                <UserPlus className="w-4 h-4" />
                                <span className="text-sm">New Clients</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">{data.summary.newClients}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2 text-blue-300 mb-2">
                                <UserCheck className="w-4 h-4" />
                                <span className="text-sm">Returning</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-400">{data.summary.returningClients}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                            <div className="flex items-center gap-2 text-purple-300 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm">Retention Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-400">{formatPercent(data.summary.retentionRate)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">Avg Between Visits</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{data.summary.avgDaysBetweenVisits.toFixed(0)} days</p>
                        </div>
                    </div>

                    {/* Top Clients */}
                    {data.topClients?.length > 0 && (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-pink-400" />
                                    Top Returning Clients
                                </h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50">
                                    <tr className="text-gray-400">
                                        <th className="text-left px-6 py-3">Client</th>
                                        <th className="text-center px-6 py-3">Visits</th>
                                        <th className="text-right px-6 py-3">Total Spent</th>
                                        <th className="text-left px-6 py-3">Preferred Barber</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {data.topClients.map((client: any) => (
                                        <tr key={client.id} className="hover:bg-gray-800/50">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                        {client.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <span className="text-white">{client.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-medium">{client.visitCount}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-emerald-400 font-medium">{formatCurrency(client.totalSpent)}</td>
                                            <td className="px-6 py-3 text-gray-300">{client.preferredBarber || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Retention by Barber */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Retention by Barber</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/50">
                                <tr className="text-gray-400">
                                    <th className="text-left px-6 py-3">Barber</th>
                                    <th className="text-center px-6 py-3">Total Clients</th>
                                    <th className="text-center px-6 py-3">New</th>
                                    <th className="text-center px-6 py-3">Returning</th>
                                    <th className="text-center px-6 py-3">Retention Rate</th>
                                    <th className="text-right px-6 py-3">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {data.barbers?.map((barber: any) => (
                                    <tr key={barber.id} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {barber.name?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-white">{barber.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-center text-white">{barber.totalClients}</td>
                                        <td className="px-6 py-3 text-center text-green-400">{barber.newClients}</td>
                                        <td className="px-6 py-3 text-center text-blue-400">{barber.returningClients}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${barber.retentionRate >= 60 ? 'bg-green-500/20 text-green-400' :
                                                barber.retentionRate >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {formatPercent(barber.retentionRate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-emerald-400 font-medium">{formatCurrency(barber.revenue)}</td>
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
