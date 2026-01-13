'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import {
    ArrowLeft,
    Calendar,
    Loader2,
    Clock,
    DollarSign,
    Activity,
    TrendingUp,
    FileDown
} from 'lucide-react'

export default function UtilizationReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: getDefaultStartDate(),
        end: new Date().toISOString().split('T')[0]
    })

    function getDefaultStartDate() {
        const now = new Date()
        now.setDate(now.getDate() - 7)
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

            const res = await fetch(`/api/franchise/reports/utilization?${params}`)
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
    const formatHours = (hours: number) => `${hours.toFixed(1)}h`

    const exportToPDF = () => {
        if (!data) return

        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Barber Utilization Report', 20, yPos)
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
        doc.text(`Total Clocked Hours: ${formatHours(data.summary.totalClockedHours)}`, 25, yPos)
        yPos += 5
        doc.text(`Total Service Hours: ${formatHours(data.summary.totalServiceHours)}`, 25, yPos)
        yPos += 5
        doc.text(`Total Idle Hours: ${formatHours(data.summary.totalIdleHours)}`, 25, yPos)
        yPos += 5
        doc.text(`Average Utilization: ${formatPercent(data.summary.avgUtilization)}`, 25, yPos)
        yPos += 5
        doc.text(`Revenue per Hour: ${formatCurrency(data.summary.avgRevenuePerHour)}`, 25, yPos)
        yPos += 5
        doc.text(`Total Revenue: ${formatCurrency(data.summary.totalRevenue)}`, 25, yPos)
        yPos += 15

        // By Barber
        doc.setFont('helvetica', 'bold')
        doc.text('Utilization by Barber:', 20, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.text('Barber', 20, yPos)
        doc.text('Clocked', 60, yPos)
        doc.text('Service', 85, yPos)
        doc.text('Idle', 110, yPos)
        doc.text('Util %', 130, yPos)
        doc.text('$/Hour', 155, yPos)
        doc.text('Revenue', 180, yPos)
        yPos += 6

        doc.setFont('helvetica', 'normal')
        data.barbers?.forEach((barber: any) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            doc.text(barber.name?.substring(0, 15) || 'Unknown', 20, yPos)
            doc.text(formatHours(barber.clockedHours), 60, yPos)
            doc.text(formatHours(barber.serviceHours), 85, yPos)
            doc.text(formatHours(barber.idleHours), 110, yPos)
            doc.text(formatPercent(barber.utilizationRate), 130, yPos)
            doc.text(formatCurrency(barber.revenuePerHour), 155, yPos)
            doc.text(formatCurrency(barber.revenue), 180, yPos)
            yPos += 5
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`utilization_report_${dateRange.start}_${dateRange.end}.pdf`)
    }

    const getUtilizationColor = (rate: number) => {
        if (rate >= 80) return 'text-green-400'
        if (rate >= 60) return 'text-yellow-400'
        return 'text-red-400'
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports/employee"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            Barber Utilization Report
                        </h1>
                        <p className="text-gray-400 mt-1">Chair efficiency and revenue per hour</p>
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
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Clocked Hours</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{formatHours(data.summary.totalClockedHours)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-sm">Service Hours</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">{formatHours(data.summary.totalServiceHours)}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                            <div className="flex items-center gap-2 text-cyan-300 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm">Avg Utilization</span>
                            </div>
                            <p className={`text-2xl font-bold ${getUtilizationColor(data.summary.avgUtilization)}`}>
                                {formatPercent(data.summary.avgUtilization)}
                            </p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm">Revenue/Hour</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.summary.avgRevenuePerHour)}</p>
                        </div>
                    </div>

                    {/* Barber Table */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Utilization by Barber</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/50">
                                <tr className="text-gray-400">
                                    <th className="text-left px-6 py-4">Barber</th>
                                    <th className="text-right px-6 py-4">Clocked</th>
                                    <th className="text-right px-6 py-4">Service</th>
                                    <th className="text-right px-6 py-4">Idle</th>
                                    <th className="text-center px-6 py-4">Utilization</th>
                                    <th className="text-right px-6 py-4">$/Hour</th>
                                    <th className="text-right px-6 py-4">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {data.barbers?.map((barber: any) => (
                                    <tr key={barber.id} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {barber.name?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-white font-medium">{barber.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-300">{formatHours(barber.clockedHours)}</td>
                                        <td className="px-6 py-4 text-right text-green-400">{formatHours(barber.serviceHours)}</td>
                                        <td className="px-6 py-4 text-right text-orange-400">{formatHours(barber.idleHours)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${barber.utilizationRate >= 80 ? 'bg-green-500/20 text-green-400' :
                                                barber.utilizationRate >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {formatPercent(barber.utilizationRate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-cyan-400">{formatCurrency(barber.revenuePerHour)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-400 font-medium">{formatCurrency(barber.revenue)}</td>
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
