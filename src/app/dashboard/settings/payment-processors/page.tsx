'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

/**
 * FIX 1 — PROVIDER-ONLY HARD GATE
 * Payment Processors page contains PAX webhook URLs, gateway credentials,
 * and full payment activity logs. Only PROVIDER role may access this page.
 * All other roles are immediately redirected to the owner dashboard.
 */
export default function PaymentProcessorsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const role = (session?.user as any)?.role

    useEffect(() => {
        if (status === 'loading') return
        if (role !== 'PROVIDER') {
            router.replace('/dashboard')
        }
    }, [status, role, router])

    // Show nothing while session is loading or redirect is in flight
    if (status === 'loading' || role !== 'PROVIDER') {
        return (
            <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="h-16 w-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-stone-400 text-sm">Checking access...</p>
                </div>
            </div>
        )
    }

    // ── PROVIDER-ONLY CONTENT ──────────────────────────────────────────────
    // Lazy-load the real implementation only when role === 'PROVIDER'
    return <PaymentProcessorsContent />
}

// ── Real implementation (only reached by PROVIDER) ─────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

function PaymentProcessorsContent() {
    const [config, setConfig] = useState<any>(null)
    const [logs, setLogs] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'config' | 'activity'>('config')
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        Promise.all([
            fetch('/api/settings/payment-processors').then(r => r.json()),
            fetch('/api/reports/payment-activity').then(r => r.json()),
        ]).then(([c, l]) => {
            setConfig(c.data)
            setLogs(l.data)
            setLoading(false)
        })
    }, [])

    const StatusBadge = ({ status }: { status: string }) => (
        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-500/20 text-stone-400'}`}>
            {status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {status}
        </span>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><CreditCard className="h-8 w-8 text-blue-500" /> Payment Processors</h1>
                    <p className="text-stone-400">PAX (in-person) + Stripe/Square (online webhooks)</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={() => setTab('config')} className={`px-4 py-2 rounded-xl ${tab === 'config' ? 'bg-blue-600' : 'bg-stone-800 hover:bg-stone-700'}`}>Configuration</button>
                <button onClick={() => setTab('activity')} className={`px-4 py-2 rounded-xl ${tab === 'activity' ? 'bg-blue-600' : 'bg-stone-800 hover:bg-stone-700'}`}>Payment Activity</button>
            </div>

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : tab === 'config' ? (
                <div className="grid md:grid-cols-3 gap-4">
                    {config?.processors && Object.entries(config.processors).map(([key, p]: [string, any]) => (
                        <div key={key} className={`border rounded-2xl p-6 ${p.status === 'ACTIVE' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-stone-900/80 border-stone-700'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xl font-bold capitalize">{key}</h3>
                                <StatusBadge status={p.status} />
                            </div>
                            <p className="text-sm text-stone-400 mb-4">{p.description}</p>
                            {p.webhookUrl && (
                                <div className="bg-stone-800 rounded-lg p-3 mb-3">
                                    <p className="text-xs text-stone-500">Webhook URL</p>
                                    <code className="text-xs text-cyan-400">{p.webhookUrl}</code>
                                </div>
                            )}
                            {p.events && (
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Events Handled</p>
                                    <div className="flex flex-wrap gap-1">
                                        {p.events.map((e: string) => (
                                            <span key={e} className="px-1.5 py-0.5 bg-stone-700 rounded text-[10px] font-mono">{e}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {logs?.summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">Payments</p>
                                <p className="text-2xl font-bold text-emerald-400">{logs.summary.totalPayments}</p>
                                <p className="text-xs text-stone-500">{formatCurrency(logs.summary.paymentVolume)} volume</p>
                            </div>
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">Refunds</p>
                                <p className="text-2xl font-bold text-amber-400">{logs.summary.totalRefunds}</p>
                                <p className="text-xs text-stone-500">{formatCurrency(logs.summary.refundVolume)}</p>
                            </div>
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">Open Disputes</p>
                                <p className={`text-2xl font-bold ${logs.summary.openDisputes > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{logs.summary.openDisputes}</p>
                            </div>
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">Payouts</p>
                                <p className="text-2xl font-bold text-blue-400">{logs.summary.totalPayouts}</p>
                                <p className="text-xs text-stone-500">{formatCurrency(logs.summary.payoutVolume)} deposited</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 mb-4">
                        {['all', 'STRIPE', 'SQUARE'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm ${filter === f ? 'bg-blue-600' : 'bg-stone-800 hover:bg-stone-700'}`}>{f === 'all' ? 'All' : f}</button>
                        ))}
                    </div>

                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-stone-700">
                                <th className="text-left py-3 px-4 text-stone-400">Date</th>
                                <th className="text-left py-3 px-4 text-stone-400">Provider</th>
                                <th className="text-left py-3 px-4 text-stone-400">Type</th>
                                <th className="text-right py-3 px-4 text-stone-400">Amount</th>
                                <th className="text-left py-3 px-4 text-stone-400">Status</th>
                            </tr></thead>
                            <tbody>
                                {(logs?.logs || []).filter((l: any) => filter === 'all' || l.provider === filter).slice(0, 50).map((log: any) => (
                                    <tr key={log.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                                        <td className="py-3 px-4 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${log.provider === 'STRIPE' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{log.provider}</span></td>
                                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs ${log.type === 'DISPUTE' ? 'bg-red-500/20 text-red-400' : log.type === 'REFUND' ? 'bg-amber-500/20 text-amber-400' : log.type === 'PAYOUT' ? 'bg-green-500/20 text-green-400' : 'bg-stone-500/20 text-stone-400'}`}>{log.type}</span></td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(log.amount)}</td>
                                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs ${log.status?.includes('SUCCEEDED') || log.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : log.status?.includes('FAIL') ? 'bg-red-500/20 text-red-400' : log.status?.includes('DISPUTE') ? 'bg-red-500/20 text-red-400' : 'bg-stone-500/20 text-stone-400'}`}>{log.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
