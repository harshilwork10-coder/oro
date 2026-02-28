'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function EmployeeReportPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/franchise/employees')
            .then(r => r.json()).then(d => { setData(d.data || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8 text-orange-500" /> Employee Report</h1>
                    <p className="text-stone-400">Staff performance and activity</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data.length > 0 ? (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">Employee</th>
                            <th className="text-left py-3 px-4 text-stone-400">Role</th>
                            <th className="text-left py-3 px-4 text-stone-400">Email</th>
                            <th className="text-right py-3 px-4 text-stone-400">Status</th>
                        </tr></thead>
                        <tbody>{data.map((emp: any, i: number) => (
                            <tr key={emp.id || i} className="border-b border-stone-800 hover:bg-stone-800/50">
                                <td className="py-3 px-4 font-medium">{emp.firstName} {emp.lastName}</td>
                                <td className="py-3 px-4 text-stone-400">{emp.role || 'Staff'}</td>
                                <td className="py-3 px-4 text-stone-400">{emp.email || '—'}</td>
                                <td className="py-3 px-4 text-right">
                                    <span className={`px-2 py-1 rounded text-xs ${emp.isActive !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-500/20 text-stone-400'}`}>
                                        {emp.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No employees found.</p>}
        </div>
    )
}
