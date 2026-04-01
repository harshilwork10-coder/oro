'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, FileSpreadsheet, Download, RefreshCw, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ALLOWED_ROLES = ['OWNER', 'ACCOUNTANT', 'PROVIDER']

export default function AccountingExportPage() {
    const { data: session } = useSession()
    const role = (session?.user as any)?.role
    if (session !== undefined && !ALLOWED_ROLES.includes(role)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <Lock className="h-16 w-16 mx-auto text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
                    <p className="text-stone-400 mb-6">Accounting exports are restricted to Owners and Accountants only.</p>
                    <Link href="/dashboard/owner" className="px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl">← Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const [format, setFormat] = useState('QUICKBOOKS')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const generate = async () => {
        setLoading(true)
        const res = await fetch(`/api/reports/accounting-export?format=${format}&date=${date}`)
        const d = await res.json()
        setData(d.data)
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-8 w-8 text-green-500" /> Accounting Export</h1>
                    <p className="text-stone-400">Generate journal entries for QuickBooks or Xero</p>
                </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Format</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5">
                            <option value="QUICKBOOKS">QuickBooks</option><option value="XERO">Xero</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-stone-400 block mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5" />
                    </div>
                    <button onClick={generate} disabled={loading} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-semibold flex items-center gap-2">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Generate
                    </button>
                </div>
            </div>

            {data && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{data.format} Journal Entry — {data.date}</h2>
                        <span className="text-sm text-stone-400">{data.transactionCount} transactions</span>
                    </div>

                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">Account</th>
                            <th className="text-right py-3 px-4 text-stone-400">Debit</th>
                            <th className="text-right py-3 px-4 text-stone-400">Credit</th>
                        </tr></thead>
                        <tbody>
                            {(data.journal || data.lines || []).map((line: any, i: number) => (
                                <tr key={i} className="border-b border-stone-800">
                                    <td className="py-3 px-4">{line.account || line.description}</td>
                                    <td className="py-3 px-4 text-right font-mono text-emerald-400">{(line.debit || (line.amount > 0 ? line.amount : 0)) > 0 ? formatCurrency(line.debit || line.amount) : ''}</td>
                                    <td className="py-3 px-4 text-right font-mono text-red-400">{(line.credit || (line.amount < 0 ? -line.amount : 0)) > 0 ? formatCurrency(line.credit || -line.amount) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
