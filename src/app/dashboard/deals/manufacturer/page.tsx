'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle, AlertCircle, Calendar } from 'lucide-react'

export default function ManufacturerDealsPage() {
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState<any>(null)
    const [reportStartDate, setReportStartDate] = useState('')
    const [reportEndDate, setReportEndDate] = useState('')
    const [generating, setGenerating] = useState(false)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadResult(null)

        const formData = new FormData()
        formData.append('file', file)
        // Manufacturer is auto-detected from PDF

        try {
            const res = await fetch('/api/tobacco-scan/import-deals', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            setUploadResult(data)
        } catch (error) {
            setUploadResult({ error: 'Failed to upload file' })
        }

        setUploading(false)
    }

    const generateReport = async (format: 'json' | 'csv') => {
        if (!reportStartDate || !reportEndDate) {
            alert('Please select the sales period date range')
            return
        }

        setGenerating(true)

        try {
            const params = new URLSearchParams({
                startDate: reportStartDate,
                endDate: reportEndDate,
                format
            })

            if (format === 'csv') {
                const res = await fetch(`/api/reports/manufacturer-rebate?${params}`)
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `rebate-report-${reportStartDate}-${reportEndDate}.csv`
                a.click()
            } else {
                const res = await fetch(`/api/reports/manufacturer-rebate?${params}`)
                const data = await res.json()
                console.log('Report:', data)
                alert(`Report generated: ${data.data?.length || 0} rows, Total Rebate: $${data.totals?.totalRebate || 0}`)
            }
        } catch (error) {
            alert('Failed to generate report')
        }

        setGenerating(false)
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">Manufacturer Penny Programs</h1>
                    <p className="text-stone-400 mt-1">Import deals from PDF and generate rebate reports</p>
                </div>

                {/* Upload Section */}
                <div className="bg-stone-900 rounded-xl p-6 border border-stone-800">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-400" />
                        Import Deals from PDF
                    </h2>
                    <p className="text-stone-400 text-sm mb-4">
                        Upload manufacturer deal sheet PDF. Manufacturer, deals, and dates are auto-detected.
                    </p>

                    <label className="block">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                            ${uploading ? 'border-blue-500 bg-blue-500/10' : 'border-stone-700 hover:border-blue-500 hover:bg-blue-500/5'}`}>
                            {uploading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                    <span>Processing PDF...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-stone-500" />
                                    <span className="text-stone-400">Click to upload PDF</span>
                                </div>
                            )}
                        </div>
                    </label>

                    {/* Upload Result */}
                    {uploadResult && (
                        <div className={`mt-4 p-4 rounded-lg ${uploadResult.error ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                            {uploadResult.error ? (
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertCircle className="h-5 w-5" />
                                    {uploadResult.error}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                        <CheckCircle className="h-5 w-5" />
                                        {uploadResult.message}
                                    </div>
                                    {uploadResult.manufacturer && (
                                        <div className="text-stone-400 text-sm mb-2">
                                            Manufacturer: <span className="text-white">{uploadResult.manufacturer}</span>
                                        </div>
                                    )}
                                    {uploadResult.deals?.length > 0 && (
                                        <div className="mt-2 space-y-1 text-sm">
                                            {uploadResult.deals.map((d: any, i: number) => (
                                                <div key={i} className="text-stone-300">
                                                    ✓ {d.name} - ${d.discount} OFF (PLU: {d.plu})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Report Section */}
                <div className="bg-stone-900 rounded-xl p-6 border border-stone-800">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                        Generate Rebate Report
                    </h2>
                    <p className="text-stone-400 text-sm mb-4">
                        Select the <strong>sales period</strong> to generate a CSV report for manufacturer rebate claims.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Sales Period Start</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={(e) => setReportStartDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Sales Period End</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={(e) => setReportEndDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => generateReport('csv')}
                            disabled={generating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold disabled:opacity-50"
                        >
                            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            Download CSV
                        </button>
                        <button
                            onClick={() => generateReport('json')}
                            disabled={generating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold disabled:opacity-50"
                        >
                            Preview Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
