'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, ShieldCheck, Check, X, RefreshCw, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ALLOWED_ROLES = ['OWNER', 'MANAGER', 'PROVIDER']
const CAN_APPROVE_ROLES = ['OWNER', 'MANAGER', 'PROVIDER']

export default function ApprovalQueuePage() {
    const { data: session } = useSession()
    const role = (session?.user as any)?.role
    const canApprove = CAN_APPROVE_ROLES.includes(role)
    if (session !== undefined && !ALLOWED_ROLES.includes(role)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <Lock className="h-16 w-16 mx-auto text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
                    <p className="text-stone-400 mb-6">The approval queue is restricted to Owners and Managers only.</p>
                    <Link href="/dashboard/owner" className="px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl">← Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('PENDING')

    const fetch_ = async () => {
        setLoading(true)
        const res = await fetch(`/api/pos/approval-queue?status=${filter}`)
        const d = await res.json()
        setRequests(d.data?.requests || [])
        setLoading(false)
    }

    useEffect(() => { fetch_() }, [filter])

    const handleAction = async (id: string, action: 'APPROVE' | 'DENY') => {
        await fetch('/api/pos/approval-queue', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        })
        fetch_()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-orange-500" /> Approval Queue</h1>
                        <p className="text-stone-400">Void, refund & override requests</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {['PENDING', 'APPROVED', 'DENIED'].map(s => (
                        <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm ${filter === s ? 'bg-orange-600' : 'bg-stone-800 hover:bg-stone-700'}`}>{s}</button>
                    ))}
                </div>
            </div>

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : requests.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><ShieldCheck className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>No {filter.toLowerCase()} requests</p></div>
            ) : (
                <div className="space-y-3">
                    {requests.map(r => {
                        const d = r.data ? JSON.parse(r.data) : {}
                        return (
                            <div key={r.id} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${r.type === 'VOID' ? 'bg-red-500/20 text-red-400' : r.type === 'REFUND' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{r.type}</span>
                                        <span className="text-sm text-stone-400">{new Date(r.createdAt).toLocaleString()}</span>
                                    </div>
                                    {d.reason && <p className="mt-2 text-sm">{d.reason}</p>}
                                    {d.amount && <p className="text-emerald-400 font-mono mt-1">{formatCurrency(d.amount)}</p>}
                                </div>
                                {filter === 'PENDING' && canApprove && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAction(r.id, 'APPROVE')} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl"><Check className="h-4 w-4" /> Approve</button>
                                        <button onClick={() => handleAction(r.id, 'DENY')} className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl"><X className="h-4 w-4" /> Deny</button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
