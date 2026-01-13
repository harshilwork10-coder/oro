'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Clock,
    ArrowLeft,
    Calendar,
    RefreshCw,
    User,
    FileDown
} from 'lucide-react'
import Link from 'next/link'
import jsPDF from 'jspdf'

interface TimeEntry {
    id: string
    employeeName: string
    date: string
    clockIn: string
    clockOut: string
    hoursWorked: number
    breakMinutes: number
}

export default function HoursWagesPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/hours-wages?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data.entries || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0)

    const exportCSV = () => {
        const headers = ['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours']
        const csvContent = [
            headers.join(','),
            ...entries.map(e => [
                `"${e.employeeName}"`,
                e.date,
                e.clockIn,
                e.clockOut || 'Active',
                e.hoursWorked.toFixed(2)
            ].join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hours_wages_${startDate}_${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20
        doc.setFontSize(18)
        doc.text('Hours & Wages Report', 20, yPos)
        yPos += 10
        doc.setFontSize(10)
        doc.text(`Period: ${startDate} to ${endDate}`, 20, yPos)
        yPos += 10

        const headers = ['Employee', 'Date', 'In', 'Out', 'Hours']
        const xPos = [20, 60, 90, 110, 140]
        doc.setFont('helvetica', 'bold')
        headers.forEach((h, i) => doc.text(h, xPos[i], yPos))
        yPos += 7
        doc.line(20, yPos - 5, 190, yPos - 5)

        doc.setFont('helvetica', 'normal')
        entries.forEach(e => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(e.employeeName.substring(0, 20), xPos[0], yPos)
            doc.text(e.date, xPos[1], yPos)
            doc.text(e.clockIn, xPos[2], yPos)
            doc.text(e.clockOut || '-', xPos[3], yPos)
            doc.text(e.hoursWorked.toFixed(2), xPos[4], yPos)
            yPos += 7
        })
        doc.save(`hours_wages_${startDate}_${endDate}.pdf`)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/employee" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            Hours & Wages
                        </h1>
                        <p className="text-gray-400 mt-1">Employee time entries</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToPDF} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white" title="Export PDF">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={exportCSV} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white" title="Export Excel">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Entries</p>
                    <p className="text-2xl font-bold text-white">{entries.length}</p>
                </div>
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">Total Hours</p>
                    <p className="text-2xl font-bold text-blue-400">{totalHours.toFixed(2)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Clock In</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Clock Out</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Break (min)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No time entries found</td></tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-white">{entry.employeeName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{entry.date}</td>
                                    <td className="px-4 py-3 text-green-400">{entry.clockIn}</td>
                                    <td className="px-4 py-3 text-red-400">{entry.clockOut || 'Active'}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{entry.breakMinutes}</td>
                                    <td className="px-4 py-3 text-right text-white font-medium">{entry.hoursWorked.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
