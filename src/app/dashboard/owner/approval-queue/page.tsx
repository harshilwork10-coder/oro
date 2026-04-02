'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, ShieldCheck, Check, X, RefreshCw, Lock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
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
    // FIX 2: Per-card denial state
    const [denyingId, setDenyingId] = useState<string | null>(null)
    const [denyReason, setDenyReason] = useState('')
    const [savingId, setSavingId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetch_ = async () => {
        setLoading(true)
        const res = await fetch(`/api/pos/approval-queue?status=${filter}`)
        const d = await res.json()
        setRequests(d.data?.requests || [])
        setLoading(false)
    }

    useEffect(() => { fetch_() }, [filter])

    const handleApprove = async (id: string) => {
        setSavingId(id)
        await fetch('/api/pos/approval-queue', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'APPROVE' })
        })
        setSavingId(null)
        fetch_()
    }

    // FIX 2: Deny requires reason — opens inline form then submits with denialReason
    const handleDeny = async (id: string) => {
        if (!denyReason.trim()) return
        setSavingId(id)
        await fetch('/api/pos/approval-queue', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'DENY', denialReason: denyReason.trim() })
        })
        setSavingId(null)
        setDenyingId(null)
        setDenyReason('')
        fetch_()
    }

    const typeColors: Record<string, string> = {
        VOID: 'bg-red-500/20 text-red-400 border border-red-500/30',
        REFUND: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        OVERRIDE: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-orange-500" /> Approval Queue</h1>
                        <p className="text-stone-400">Void, refund &amp; override requests</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {['PENDING', 'APPROVED', 'DENIED'].map(s => (
                        <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm ${filter === s ? 'bg-orange-600' : 'bg-stone-800 hover:bg-stone-700'}`}>{s}</button>
                    ))}
                    <button onClick={fetch_} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 text-stone-500">
                    <ShieldCheck className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">No {filter.toLowerCase()} requests</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(r => {
                        const d = r.data ? JSON.parse(r.data) : {}
                        const isDenying = denyingId === r.id
                        const isSaving = savingId === r.id
                        const isExpanded = expandedId === r.id

                        return (
                            <div key={r.id} className={`bg-stone-900/80 border rounded-2xl overflow-hidden transition-all ${
                                r.status === 'DENIED' ? 'border-red-500/20' :
                                r.status === 'APPROVED' ? 'border-emerald-500/20' :
                                'border-stone-700'
                            }`}>
                                {/* Main Row */}
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${typeColors[r.type] || typeColors.OVERRIDE}`}>
                                                {r.type}
                                            </span>
                                            <span className="text-sm text-stone-400">{new Date(r.createdAt).toLocaleString()}</span>
                                            {r.employeeName && (
                                                <span className="text-sm text-stone-500">by {r.employeeName}</span>
                                            )}
                                        </div>
                                        {d.reason && <p className="mt-2 text-sm text-stone-300">{d.reason}</p>}
                                        {d.amount != null && (
                                            <p className="text-emerald-400 font-mono font-bold mt-1">{formatCurrency(d.amount)}</p>
                                        )}
                                        {/* FIX 2: Show denial reason in history */}
                                        {r.status === 'DENIED' && r.denialReason && (
                                            <div className="mt-2 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                                                <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                <span><strong>Denial reason:</strong> {r.denialReason}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {filter === 'PENDING' && canApprove && !isDenying && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(r.id)}
                                                    disabled={isSaving}
                                                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50"
                                                >
                                                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => { setDenyingId(r.id); setDenyReason('') }}
                                                    className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl"
                                                >
                                                    <X className="h-4 w-4" />
                                                    Deny
                                                </button>
                                            </>
                                        )}
                                        {(d.items || d.products) && (
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                                className="p-2 hover:bg-stone-800 rounded-xl"
                                            >
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* FIX 2: Inline denial reason form */}
                                {isDenying && (
                                    <div className="px-5 pb-5 border-t border-stone-700 pt-4 bg-red-500/5">
                                        <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Denial Reason <span className="text-red-500">*</span>
                                        </p>
                                        <textarea
                                            value={denyReason}
                                            onChange={(e) => setDenyReason(e.target.value)}
                                            placeholder="Explain why this request is being denied…"
                                            rows={2}
                                            className="w-full bg-stone-900 border border-red-500/40 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-red-400 mb-3"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setDenyingId(null); setDenyReason('') }}
                                                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleDeny(r.id)}
                                                disabled={!denyReason.trim() || isSaving}
                                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                                Confirm Denial
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded items */}
                                {isExpanded && (d.items || d.products) && (
                                    <div className="px-5 pb-5 border-t border-stone-800 pt-4">
                                        <p className="text-xs text-stone-500 mb-2">Items in request:</p>
                                        <div className="space-y-1">
                                            {(d.items || d.products || []).map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span>{item.name || item.itemName}</span>
                                                    <span className="text-stone-400">×{item.quantity || 1} {item.price ? `@ ${formatCurrency(item.price)}` : ''}</span>
                                                </div>
                                            ))}
                                        </div>
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
