'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import {
    ArrowLeft,
    Calendar,
    Loader2,
    UserX,
    AlertTriangle,
    DollarSign,
    Clock,
    User,
    FileDown
} from 'lucide-react'

export default function NoShowReportPage() {
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

            const res = await fetch(`/api/franchise/reports/no-shows?${params}`)
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
        doc.text('No-Show & Cancellation Report', 20, yPos)
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
        doc.text(`Total Appointments: ${data.summary.totalAppointments}`, 25, yPos)
        yPos += 5
        doc.text(`No-Shows: ${data.summary.totalNoShows} (${formatPercent(data.summary.noShowRate)})`, 25, yPos)
        yPos += 5
        doc.text(`Cancellations: ${data.summary.totalCancellations} (${formatPercent(data.summary.cancellationRate)})`, 25, yPos)
        yPos += 5
        doc.text(`Estimated Lost Revenue: ${formatCurrency(data.summary.estimatedLostRevenue)}`, 25, yPos)
        yPos += 15

        // Repeat Offenders
        if (data.repeatOffenders.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Repeat Offenders:', 20, yPos)
            yPos += 7
            doc.setFont('helvetica', 'normal')
            data.repeatOffenders.slice(0, 10).forEach((client: any) => {
                doc.text(`  ${client.name || 'Unknown'}: ${client.noShows} no-shows, ${client.cancellations} cancellations`, 20, yPos)
                yPos += 5
            })
            yPos += 10
        }

        // Recent Appointments
        doc.setFont('helvetica', 'bold')
        doc.text('Recent No-Shows & Cancellations:', 20, yPos)
        yPos += 7
        doc.setFont('helvetica', 'normal')
        data.recentAppointments?.slice(0, 15).forEach((apt: any) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            doc.text(`  ${formatDate(apt.date)} - ${apt.client} - ${apt.service} - ${apt.status} - ${formatCurrency(apt.lostRevenue)}`, 20, yPos)
            yPos += 5
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`no_show_report_${dateRange.start}_${dateRange.end}.pdf`)
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600">
                                <UserX className="w-6 h-6 text-white" />
                            </div>
                            No-Show & Cancellation Report
                        </h1>
                        <p className="text-gray-400 mt-1">Track missed appointments and lost revenue</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">Total Appointments</p>
                            <p className="text-2xl font-bold text-white">{data.summary.totalAppointments}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                            <p className="text-red-300 text-sm mb-1">No-Shows</p>
                            <p className="text-2xl font-bold text-red-400">{data.summary.totalNoShows}</p>
                            <p className="text-red-300 text-xs">{formatPercent(data.summary.noShowRate)} rate</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                            <p className="text-orange-300 text-sm mb-1">Cancellations</p>
                            <p className="text-2xl font-bold text-orange-400">{data.summary.totalCancellations}</p>
                            <p className="text-orange-300 text-xs">{formatPercent(data.summary.cancellationRate)} rate</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-gray-400 text-sm mb-1">Est. Lost Revenue</p>
                            <p className="text-2xl font-bold text-red-400">{formatCurrency(data.summary.estimatedLostRevenue)}</p>
                        </div>
                    </div>

                    {/* By Day of Week */}
                    <div className="glass-panel rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4">No-Shows by Day of Week</h3>
                        <div className="flex gap-2">
                            {data.byDayOfWeek.map((day: any) => (
                                <div key={day.day} className="flex-1 text-center">
                                    <div
                                        className="bg-red-500/20 rounded-lg mx-auto mb-2"
                                        style={{
                                            height: `${Math.max(20, day.count * 10)}px`,
                                            maxHeight: '100px'
                                        }}
                                    />
                                    <p className="text-gray-400 text-xs">{day.day.slice(0, 3)}</p>
                                    <p className="text-white font-medium">{day.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Repeat Offenders */}
                    {data.repeatOffenders.length > 0 && (
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-700 bg-red-500/10">
                                <h3 className="text-red-400 font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Repeat Offenders
                                </h3>
                                <p className="text-red-300 text-sm">Clients with multiple no-shows/cancellations</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50">
                                    <tr className="text-gray-400">
                                        <th className="text-left px-6 py-3">Client</th>
                                        <th className="text-left px-6 py-3">Contact</th>
                                        <th className="text-center px-6 py-3">No-Shows</th>
                                        <th className="text-center px-6 py-3">Cancellations</th>
                                        <th className="text-center px-6 py-3">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {data.repeatOffenders.slice(0, 10).map((client: any) => (
                                        <tr key={client.id} className="hover:bg-gray-800/50">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 bg-red-500/20 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-red-400" />
                                                    </div>
                                                    <span className="text-white">{client.name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-400">
                                                {client.email || client.phone || '-'}
                                            </td>
                                            <td className="px-6 py-3 text-center text-red-400 font-medium">{client.noShows}</td>
                                            <td className="px-6 py-3 text-center text-orange-400 font-medium">{client.cancellations}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded font-medium">{client.total}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Recent No-Shows */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Recent No-Shows & Cancellations</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/50">
                                <tr className="text-gray-400">
                                    <th className="text-left px-6 py-3">Date</th>
                                    <th className="text-left px-6 py-3">Client</th>
                                    <th className="text-left px-6 py-3">Barber</th>
                                    <th className="text-left px-6 py-3">Service</th>
                                    <th className="text-center px-6 py-3">Status</th>
                                    <th className="text-right px-6 py-3">Lost Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {data.recentAppointments.map((apt: any) => (
                                    <tr key={apt.id} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-3 text-gray-300">{formatDate(apt.date)}</td>
                                        <td className="px-6 py-3 text-white">{apt.client}</td>
                                        <td className="px-6 py-3 text-gray-300">{apt.barber}</td>
                                        <td className="px-6 py-3 text-gray-300">{apt.service}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs ${apt.status === 'NO_SHOW'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {apt.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-red-400">{formatCurrency(apt.lostRevenue)}</td>
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
