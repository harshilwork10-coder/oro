'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react'

export default function ComplianceReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/loss-prevention?days=30')
            .then(r => r.json()).then(d => { setData(d.data?.dashboard); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8 text-red-500" /> Compliance Report</h1>
                    <p className="text-stone-400">Audit trail and compliance metrics</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Voids', val: data.totalVoids || 0, color: 'text-red-400' },
                        { label: 'Total Refunds', val: data.totalRefunds || 0, color: 'text-orange-400' },
                        { label: 'No-Sales', val: data.noSaleCount || 0, color: 'text-yellow-400' },
                        { label: 'Risk Score', val: data.riskScore || 'Low', color: data.riskScore === 'High' ? 'text-red-400' : 'text-emerald-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">{s.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-stone-500 py-20">No compliance data yet.</p>}
        </div>
    )
}
