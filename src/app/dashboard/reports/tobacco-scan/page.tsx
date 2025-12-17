'use client'

import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Cigarette,
    Download,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    Send,
    RefreshCw,
    ArrowLeft,
    DollarSign,
    Package,
    Tag
} from "lucide-react"
import Link from 'next/link'

interface TobaccoSubmission {
    id: string
    manufacturer: string
    weekStartDate: string
    weekEndDate: string
    recordCount: number
    totalAmount: string
    status: string
    submittedAt?: string
}

interface TobaccoSale {
    id: string
    productName: string
    barcode: string
    quantity: number
    unitPrice: number
    totalPrice: number
    saleDate: string
}

export default function TobaccoScanPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [submissions, setSubmissions] = useState<TobaccoSubmission[]>([])
    const [currentWeekData, setCurrentWeekData] = useState<{
        manufacturer: string
        sales: TobaccoSale[]
        totalScans: number
        totalAmount: number
    }[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    const manufacturers = ['ALTRIA', 'RJR', 'ITG']

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [submissionsRes, salesRes] = await Promise.all([
                fetch('/api/tobacco-scan/submissions'),
                fetch('/api/tobacco-scan/current-week')
            ])

            if (submissionsRes.ok) {
                const data = await submissionsRes.json()
                setSubmissions(data.submissions || [])
            }
            if (salesRes.ok) {
                const data = await salesRes.json()
                setCurrentWeekData(data.byManufacturer || [])
            }
        } catch (error) {
            console.error('Failed to fetch tobacco data:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateReport = async (manufacturer: string) => {
        setGenerating(true)
        try {
            const res = await fetch('/api/tobacco-scan/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manufacturer })
            })

            if (res.ok) {
                fetchData()
                alert(`${manufacturer} report generated successfully!`)
            }
        } catch (error) {
            console.error('Failed to generate report:', error)
        } finally {
            setGenerating(false)
        }
    }

    const downloadCSV = async (submissionId: string) => {
        try {
            const res = await fetch(`/api/tobacco-scan/submissions/${submissionId}/download`)
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `tobacco-scan-${submissionId}.csv`
                a.click()
            }
        } catch (error) {
            console.error('Failed to download:', error)
        }
    }

    const markAsSubmitted = async (submissionId: string) => {
        try {
            await fetch(`/api/tobacco-scan/submissions/${submissionId}/submit`, {
                method: 'POST'
            })
            fetchData()
        } catch (error) {
            console.error('Failed to mark as submitted:', error)
        }
    }

    const formatCurrency = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-500/20 text-amber-400'
            case 'SUBMITTED': return 'bg-blue-500/20 text-blue-400'
            case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-400'
            case 'REJECTED': return 'bg-red-500/20 text-red-400'
            default: return 'bg-stone-500/20 text-stone-400'
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    // Calculate totals
    const totalWeekScans = currentWeekData.reduce((sum, m) => sum + m.totalScans, 0)
    const totalWeekAmount = currentWeekData.reduce((sum, m) => sum + m.totalAmount, 0)
    const pendingSubmissions = submissions.filter(s => s.status === 'PENDING').length
    const estimatedRebate = totalWeekScans * 0.04 // ~$0.04 per scan average

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
                            <Cigarette className="h-6 w-6 text-amber-500" />
                            Tobacco Scan Data
                        </h1>
                        <p className="text-stone-500 text-sm">Generate and submit scan data for manufacturer rebates</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link
                        href="/dashboard/reports/tobacco-scan/deals"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Tag className="h-4 w-4" />
                        Manage Deals
                    </Link>
                    <button
                        onClick={() => fetchData()}
                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                        <p className="font-medium text-emerald-400">Earn Rebates with Tobacco Scan Data</p>
                        <p className="text-sm text-stone-400 mt-1">
                            Submit your tobacco sales data weekly to Altria, RJR, and ITG to earn $0.03-$0.05 per scan plus promotional discounts.
                            Estimated this week: <span className="text-emerald-400 font-medium">{formatCurrency(estimatedRebate)}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Package className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">This Week Scans</p>
                            <p className="text-xl font-bold text-stone-100">{totalWeekScans}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Week Sales</p>
                            <p className="text-xl font-bold text-stone-100">{formatCurrency(totalWeekAmount)}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Est. Rebate</p>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(estimatedRebate)}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Pending</p>
                            <p className="text-xl font-bold text-stone-100">{pendingSubmissions}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Reports by Manufacturer */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-stone-100 mb-4">Generate Weekly Reports</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {manufacturers.map(manufacturer => {
                        const data = currentWeekData.find(m => m.manufacturer === manufacturer)
                        return (
                            <div key={manufacturer} className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-stone-200">{manufacturer}</h3>
                                    <span className={`px-2 py-1 rounded text-xs ${manufacturer === 'ALTRIA' ? 'bg-red-500/20 text-red-400' :
                                        manufacturer === 'RJR' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-amber-500/20 text-amber-400'
                                        }`}>
                                        {data?.totalScans || 0} scans
                                    </span>
                                </div>
                                <p className="text-sm text-stone-400 mb-3">
                                    Sales: {formatCurrency(data?.totalAmount || 0)}
                                </p>
                                <button
                                    onClick={() => generateReport(manufacturer)}
                                    disabled={generating || !data?.totalScans}
                                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <FileText className="h-4 w-4" />
                                    Generate Report
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Submission History */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-stone-100 mb-4">Submission History</h2>

                {submissions.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No submissions yet</p>
                        <p className="text-sm mt-1">Generate your first report above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-800/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Manufacturer</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Week</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Scans</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Sales</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Status</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {submissions.map(sub => (
                                    <tr key={sub.id} className="hover:bg-stone-800/30">
                                        <td className="px-4 py-3">
                                            <span className={`font-medium ${sub.manufacturer === 'ALTRIA' ? 'text-red-400' :
                                                sub.manufacturer === 'RJR' ? 'text-blue-400' :
                                                    'text-amber-400'
                                                }`}>
                                                {sub.manufacturer}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-stone-400">
                                            {formatDate(sub.weekStartDate)} - {formatDate(sub.weekEndDate)}
                                        </td>
                                        <td className="px-4 py-3 text-stone-200">{sub.recordCount}</td>
                                        <td className="px-4 py-3 text-stone-200">{formatCurrency(sub.totalAmount)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(sub.status)}`}>
                                                {sub.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                                {sub.status === 'SUBMITTED' && <Send className="h-3 w-3" />}
                                                {sub.status === 'CONFIRMED' && <CheckCircle className="h-3 w-3" />}
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => downloadCSV(sub.id)}
                                                    className="px-2 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-xs flex items-center gap-1"
                                                >
                                                    <Download className="h-3 w-3" />
                                                    CSV
                                                </button>
                                                {sub.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => markAsSubmitted(sub.id)}
                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs flex items-center gap-1"
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                        Mark Sent
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
