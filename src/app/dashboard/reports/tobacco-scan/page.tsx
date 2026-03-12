'use client'

import { useState, useEffect, useCallback } from 'react'
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
    Tag,
    Upload,
    FileUp,
    BarChart3,
    Table,
    X,
    ChevronDown,
    ChevronUp,
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

interface ImportBatch {
    id: string
    fileName: string
    fileType: string
    importedAt: string
    status: string
    totalRows: number
    importedRows: number
    duplicateRows: number
    errorRows: number
}

interface ImportedRecord {
    id: string
    sourceRowNumber: number
    transactionDate: string | null
    basketId: string | null
    upc: string | null
    productDescription: string | null
    manufacturerName: string | null
    quantity: number | null
    unitPrice: number | null
    buydownAmount: number | null
    promoType: string | null
    loyaltyFlag: boolean
    multipackFlag: boolean
}

interface RmscAnalytics {
    totalRecords: number
    totalBuydownAmount: number
    byManufacturer: { name: string; count: number; buydown: number }[]
    byPromoType: { type: string; count: number }[]
    loyaltyCount: number
    multipackCount: number
    singleCount: number
}

type TabKey = 'overview' | 'imported' | 'analytics'

export default function TobaccoScanPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') },
    })

    const [submissions, setSubmissions] = useState<TobaccoSubmission[]>([])
    const [currentWeekData, setCurrentWeekData] = useState<{
        manufacturer: string
        sales: { id: string; productName: string; barcode: string; quantity: number; unitPrice: number; totalPrice: number; saleDate: string }[]
        totalScans: number
        totalAmount: number
    }[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [activeTab, setActiveTab] = useState<TabKey>('overview')

    // RMSC Import state
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<any>(null)
    const [importBatches, setImportBatches] = useState<ImportBatch[]>([])
    const [dragOver, setDragOver] = useState(false)

    // Imported records state
    const [importedRecords, setImportedRecords] = useState<ImportedRecord[]>([])
    const [recordsPage, setRecordsPage] = useState(0)
    const [recordsLoading, setRecordsLoading] = useState(false)

    // Analytics state
    const [analytics, setAnalytics] = useState<RmscAnalytics | null>(null)

    const manufacturers = ['ALTRIA', 'RJR', 'ITG']

    const fetchData = useCallback(async () => {
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
    }, [])

    const fetchImportBatches = useCallback(async () => {
        try {
            const res = await fetch('/api/tobacco-scan/rmsc-import/batches')
            if (res.ok) {
                const data = await res.json()
                setImportBatches(data.data?.batches || [])
            }
        } catch { /* ignore */ }
    }, [])

    const fetchImportedRecords = useCallback(async (page = 0) => {
        setRecordsLoading(true)
        try {
            const res = await fetch(`/api/tobacco-scan/rmsc-import/records?page=${page}&limit=50`)
            if (res.ok) {
                const data = await res.json()
                setImportedRecords(data.data?.records || [])
                setRecordsPage(page)
            }
        } catch { /* ignore */ } finally { setRecordsLoading(false) }
    }, [])

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch('/api/tobacco-scan/rmsc-import/analytics')
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data.data || null)
            }
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        fetchData()
        fetchImportBatches()
    }, [fetchData, fetchImportBatches])

    useEffect(() => {
        if (activeTab === 'imported') fetchImportedRecords(0)
        if (activeTab === 'analytics') fetchAnalytics()
    }, [activeTab, fetchImportedRecords, fetchAnalytics])

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

    const downloadExportFile = async (manufacturer: string) => {
        try {
            const res = await fetch(`/api/tobacco-scan/export?manufacturer=${manufacturer}`)
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                const disposition = res.headers.get('Content-Disposition')
                const filename = disposition?.match(/filename="(.+)"/)?.[1] || `${manufacturer}_SCAN_DATA.txt`
                a.download = filename
                a.click()
                window.URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Failed to download:', error)
        }
    }

    const downloadRmscExport = async () => {
        try {
            const res = await fetch('/api/tobacco-scan/rmsc-export')
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                const disposition = res.headers.get('Content-Disposition')
                a.download = disposition?.match(/filename="(.+)"/)?.[1] || 'rmsc-scan-data.csv'
                a.click()
                window.URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Failed to download RMSC:', error)
        }
    }

    const markAsSubmitted = async (submissionId: string) => {
        try {
            await fetch(`/api/tobacco-scan/submissions/${submissionId}/submit`, { method: 'POST' })
            fetchData()
        } catch (error) {
            console.error('Failed to mark as submitted:', error)
        }
    }

    // ─── RMSC Import Handler ─────────────────────────────────────
    const handleFileImport = async (file: File) => {
        setImporting(true)
        setImportResult(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/tobacco-scan/rmsc-import', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            setImportResult(data.data || data)
            if (res.ok) {
                fetchImportBatches()
                fetchAnalytics()
            }
        } catch (error) {
            setImportResult({ error: 'Upload failed' })
        } finally {
            setImporting(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileImport(file)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileImport(file)
        e.target.value = ''
    }

    // ─── Formatters ──────────────────────────────────────────────
    const formatCurrency = (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0)
    }

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'PENDING': return 'bg-amber-500/20 text-amber-400'
            case 'SUBMITTED': return 'bg-blue-500/20 text-blue-400'
            case 'CONFIRMED':
            case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-400'
            case 'PARTIAL': return 'bg-amber-500/20 text-amber-400'
            case 'REJECTED':
            case 'FAILED': return 'bg-red-500/20 text-red-400'
            default: return 'bg-stone-500/20 text-stone-400'
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            </div>
        )
    }

    const totalWeekScans = currentWeekData.reduce((sum, m) => sum + m.totalScans, 0)
    const totalWeekAmount = currentWeekData.reduce((sum, m) => sum + m.totalAmount, 0)
    const pendingSubmissions = submissions.filter(s => s.status === 'PENDING').length
    const estimatedRebate = totalWeekScans * 0.04

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
                        <p className="text-stone-500 text-sm">Generate, import, and submit scan data for manufacturer rebates</p>
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
                        onClick={downloadRmscExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        RMSC CSV
                    </button>
                    <button
                        onClick={() => fetchData()}
                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-stone-900/50 rounded-xl p-1">
                {([
                    { key: 'overview' as TabKey, label: 'Overview', icon: BarChart3 },
                    { key: 'imported' as TabKey, label: 'Imported Data', icon: Table },
                    { key: 'analytics' as TabKey, label: 'Import Analytics', icon: BarChart3 },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-amber-600 text-white shadow-lg'
                                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <>
                    {/* Rebate info */}
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

                    {/* ─── RMSC File Import ─── */}
                    <div className="glass-panel rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-stone-100 mb-4 flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-500" />
                            Import RMSC Scan Data
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Upload zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                                    dragOver
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-stone-700 hover:border-stone-500 bg-stone-900/30'
                                }`}
                                onClick={() => document.getElementById('rmsc-file-input')?.click()}
                            >
                                <input
                                    id="rmsc-file-input"
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                                <FileUp className={`h-10 w-10 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-stone-500'}`} />
                                {importing ? (
                                    <div>
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400 mb-2" />
                                        <p className="text-sm text-blue-400">Importing...</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-stone-300 font-medium">Drop RMSC file here or click to browse</p>
                                        <p className="text-xs text-stone-500 mt-1">CSV or Excel (.xlsx) — RMSC 34-field format</p>
                                    </>
                                )}
                            </div>

                            {/* Import result / Recent batches */}
                            <div>
                                {importResult && (
                                    <div className={`p-4 rounded-xl border mb-4 ${
                                        importResult.error
                                            ? 'border-red-500/30 bg-red-500/10'
                                            : 'border-emerald-500/30 bg-emerald-500/10'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className={`font-medium text-sm ${importResult.error ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {importResult.error ? 'Import Failed' : 'Import Complete'}
                                            </p>
                                            <button onClick={() => setImportResult(null)} className="text-stone-500 hover:text-stone-300">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {importResult.error ? (
                                            <p className="text-xs text-red-300">{importResult.error}</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div><span className="text-stone-400">Total:</span> <span className="text-stone-200">{importResult.rowsTotal}</span></div>
                                                <div><span className="text-stone-400">Imported:</span> <span className="text-emerald-400">{importResult.rowsImported}</span></div>
                                                <div><span className="text-stone-400">Duplicates:</span> <span className="text-amber-400">{importResult.rowsDuplicate}</span></div>
                                                <div><span className="text-stone-400">Errors:</span> <span className="text-red-400">{importResult.rowsErrored}</span></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-stone-500 uppercase mb-2">Recent Imports</p>
                                {importBatches.length === 0 ? (
                                    <p className="text-xs text-stone-600">No imports yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {importBatches.slice(0, 10).map(batch => (
                                            <div key={batch.id} className="flex items-center justify-between p-2 bg-stone-800/50 rounded-lg text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                                                    <span className="text-stone-300 truncate">{batch.fileName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-stone-500">{batch.importedRows} rows</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${getStatusColor(batch.status)}`}>
                                                        {batch.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                manufacturer === 'ALTRIA' ? 'bg-red-500/20 text-red-400' :
                                                manufacturer === 'RJR' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {data?.totalScans || 0} scans
                                            </span>
                                        </div>
                                        <p className="text-sm text-stone-400 mb-3">Sales: {formatCurrency(data?.totalAmount || 0)}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => generateReport(manufacturer)}
                                                disabled={generating || !data?.totalScans}
                                                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Generate
                                            </button>
                                            <button
                                                onClick={() => downloadExportFile(manufacturer)}
                                                disabled={!data?.totalScans}
                                                className="py-2 px-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <Download className="h-4 w-4" />
                                                TXT
                                            </button>
                                        </div>
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
                                                    <span className={`font-medium ${
                                                        sub.manufacturer === 'ALTRIA' ? 'text-red-400' :
                                                        sub.manufacturer === 'RJR' ? 'text-blue-400' : 'text-amber-400'
                                                    }`}>{sub.manufacturer}</span>
                                                </td>
                                                <td className="px-4 py-3 text-stone-400">{formatDate(sub.weekStartDate)} - {formatDate(sub.weekEndDate)}</td>
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
                                                            onClick={() => downloadExportFile(sub.manufacturer)}
                                                            className="px-2 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-xs flex items-center gap-1"
                                                        >
                                                            <Download className="h-3 w-3" /> TXT
                                                        </button>
                                                        {sub.status === 'PENDING' && (
                                                            <button
                                                                onClick={() => markAsSubmitted(sub.id)}
                                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs flex items-center gap-1"
                                                            >
                                                                <CheckCircle className="h-3 w-3" /> Mark Sent
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
                </>
            )}

            {/* ═══ IMPORTED DATA TAB ═══ */}
            {activeTab === 'imported' && (
                <div className="glass-panel rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-stone-100 mb-4 flex items-center gap-2">
                        <Table className="h-5 w-5 text-blue-500" />
                        Imported RMSC Records
                    </h2>
                    {recordsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-stone-500" />
                        </div>
                    ) : importedRecords.length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No imported records yet</p>
                            <p className="text-sm mt-1">Upload an RMSC CSV/Excel file from the Overview tab</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-800/50">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Row</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Date</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Basket</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">UPC</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Description</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Mfg</th>
                                            <th className="text-right px-3 py-2 text-xs text-stone-400 uppercase">Qty</th>
                                            <th className="text-right px-3 py-2 text-xs text-stone-400 uppercase">Price</th>
                                            <th className="text-right px-3 py-2 text-xs text-stone-400 uppercase">Buydown</th>
                                            <th className="text-left px-3 py-2 text-xs text-stone-400 uppercase">Promo</th>
                                            <th className="text-center px-3 py-2 text-xs text-stone-400 uppercase">Loyalty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-800/50">
                                        {importedRecords.map(rec => (
                                            <tr key={rec.id} className="hover:bg-stone-800/30">
                                                <td className="px-3 py-2 text-stone-500">{rec.sourceRowNumber}</td>
                                                <td className="px-3 py-2 text-stone-400">{rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : '-'}</td>
                                                <td className="px-3 py-2 text-stone-400">{rec.basketId || '-'}</td>
                                                <td className="px-3 py-2 text-stone-300 font-mono text-xs">{rec.upc || '-'}</td>
                                                <td className="px-3 py-2 text-stone-200 max-w-[200px] truncate">{rec.productDescription || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-xs font-medium ${
                                                        rec.manufacturerName === 'ALTRIA' ? 'text-red-400' :
                                                        rec.manufacturerName === 'RJR' ? 'text-blue-400' :
                                                        rec.manufacturerName === 'ITG' ? 'text-amber-400' :
                                                        'text-stone-400'
                                                    }`}>{rec.manufacturerName || '-'}</span>
                                                </td>
                                                <td className="px-3 py-2 text-right text-stone-200">{rec.quantity ?? '-'}</td>
                                                <td className="px-3 py-2 text-right text-stone-200">{rec.unitPrice ? formatCurrency(rec.unitPrice) : '-'}</td>
                                                <td className="px-3 py-2 text-right text-emerald-400">{rec.buydownAmount ? formatCurrency(rec.buydownAmount) : '-'}</td>
                                                <td className="px-3 py-2">
                                                    {rec.promoType ? (
                                                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">{rec.promoType}</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {rec.loyaltyFlag ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={() => fetchImportedRecords(Math.max(0, recordsPage - 1))}
                                    disabled={recordsPage === 0}
                                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-sm text-stone-300 rounded-lg disabled:opacity-50"
                                >
                                    ← Previous
                                </button>
                                <span className="text-sm text-stone-500">Page {recordsPage + 1}</span>
                                <button
                                    onClick={() => fetchImportedRecords(recordsPage + 1)}
                                    disabled={importedRecords.length < 50}
                                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-sm text-stone-300 rounded-lg disabled:opacity-50"
                                >
                                    Next →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══ ANALYTICS TAB ═══ */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {!analytics ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="h-8 w-8 animate-spin text-stone-500" />
                        </div>
                    ) : analytics.totalRecords === 0 ? (
                        <div className="glass-panel rounded-xl p-12 text-center text-stone-500">
                            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No imported data to analyze</p>
                            <p className="text-sm mt-1">Upload RMSC scan data from the Overview tab first</p>
                        </div>
                    ) : (
                        <>
                            {/* Analytics summary cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass-panel p-4 rounded-xl">
                                    <p className="text-xs text-stone-500 uppercase">Total Imported Scans</p>
                                    <p className="text-2xl font-bold text-stone-100 mt-1">{analytics.totalRecords.toLocaleString()}</p>
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <p className="text-xs text-stone-500 uppercase">Total Buydown</p>
                                    <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(analytics.totalBuydownAmount)}</p>
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <p className="text-xs text-stone-500 uppercase">Loyalty Scans</p>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.loyaltyCount.toLocaleString()}</p>
                                    <p className="text-xs text-stone-500">{analytics.totalRecords > 0 ? Math.round(analytics.loyaltyCount / analytics.totalRecords * 100) : 0}% of total</p>
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <p className="text-xs text-stone-500 uppercase">Multipack vs Single</p>
                                    <p className="text-2xl font-bold text-purple-400 mt-1">{analytics.multipackCount}</p>
                                    <p className="text-xs text-stone-500">vs {analytics.singleCount} single</p>
                                </div>
                            </div>

                            {/* Manufacturer breakdown */}
                            <div className="glass-panel rounded-xl p-6">
                                <h3 className="text-sm font-semibold text-stone-300 uppercase mb-4">By Manufacturer</h3>
                                <div className="space-y-3">
                                    {analytics.byManufacturer.map(m => {
                                        const pct = analytics.totalRecords > 0 ? (m.count / analytics.totalRecords * 100) : 0
                                        return (
                                            <div key={m.name} className="flex items-center gap-4">
                                                <span className={`text-sm font-medium w-16 ${
                                                    m.name === 'ALTRIA' ? 'text-red-400' :
                                                    m.name === 'RJR' ? 'text-blue-400' :
                                                    m.name === 'ITG' ? 'text-amber-400' :
                                                    'text-stone-400'
                                                }`}>{m.name}</span>
                                                <div className="flex-1 h-6 bg-stone-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            m.name === 'ALTRIA' ? 'bg-red-500/40' :
                                                            m.name === 'RJR' ? 'bg-blue-500/40' :
                                                            m.name === 'ITG' ? 'bg-amber-500/40' :
                                                            'bg-stone-500/40'
                                                        }`}
                                                        style={{ width: `${Math.max(1, pct)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-stone-400 w-20 text-right">{m.count.toLocaleString()} scans</span>
                                                <span className="text-xs text-emerald-400 w-20 text-right">{formatCurrency(m.buydown)}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Promo type breakdown */}
                            <div className="glass-panel rounded-xl p-6">
                                <h3 className="text-sm font-semibold text-stone-300 uppercase mb-4">By Promo Type</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {analytics.byPromoType.map(p => (
                                        <div key={p.type} className="p-3 bg-stone-800/50 rounded-lg">
                                            <p className="text-xs text-stone-500">{p.type || 'NO PROMO'}</p>
                                            <p className="text-lg font-bold text-stone-100">{p.count.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
