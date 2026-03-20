'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileText } from 'lucide-react'

export default function ReportDownloadPage() {
    const [generating, setGenerating] = useState<string | null>(null)

    const exportReport = async (type: string) => {
        setGenerating(type)
        try {
            const res = await fetch('/api/documents/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id: 'latest' })
            })
            const data = await res.json()
            if (data.data?.html) {
                const w = window.open('', '_blank')
                if (w) { w.document.write(data.data.html); w.document.close(); w.print() }
            }
        } catch (e) {
            console.error('Export failed:', e)
        }
        setGenerating(null)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Download className="h-8 w-8 text-blue-500" /> Download Reports</h1>
                    <p className="text-stone-400">Generate and download PDF reports</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { type: 'eod-report', label: 'End of Day Report', desc: 'Full Z-report with all sales data', icon: FileText },
                    { type: 'invoice', label: 'Invoice Template', desc: 'Generate invoice for customer', icon: FileText },
                    { type: 'purchase-order', label: 'Purchase Order', desc: 'Generate PO for vendor', icon: FileText },
                ].map(r => (
                    <button key={r.type} onClick={() => exportReport(r.type)} disabled={generating === r.type}
                        className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 text-left hover:border-blue-500/50 disabled:opacity-50">
                        <r.icon className="h-8 w-8 text-blue-400 mb-3" />
                        <p className="font-semibold text-lg">{r.label}</p>
                        <p className="text-sm text-stone-400 mt-1">{r.desc}</p>
                        <p className="text-xs text-blue-400 mt-3">{generating === r.type ? 'Generating...' : 'Click to generate PDF'}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}
