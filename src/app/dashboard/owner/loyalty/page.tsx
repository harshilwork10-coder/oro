'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Award, RefreshCw, Search, Plus, Star, User, DollarSign,
    TrendingUp, Settings, Gift, Shield, Eye, Wrench, ChevronDown, ChevronUp,
    AlertTriangle, FileText, Zap, MinusCircle, PlusCircle, BarChart3, Tag,
    Download, Bell, Info, ShieldAlert, HelpCircle, Store
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import SmartRewardsManager from '@/components/loyalty/SmartRewardsManager'

type TabId = 'overview' | 'activity' | 'lookup' | 'adjust'

interface Stats {
    totalMembers: number; activeMembers: number; totalPointsOutstanding: number
    totalLifetimePoints: number; totalLifetimeSpend: number
}

export default function LoyaltyPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [program, setProgram] = useState<any>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [topMembers, setTopMembers] = useState<any[]>([])
    const [message, setMessage] = useState('')
    const [showEnroll, setShowEnroll] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [enrollForm, setEnrollForm] = useState({ phone: '', email: '', name: '' })
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    // Overview
    const [summary, setSummary] = useState<any>(null)
    const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0])
    const [alerts, setAlerts] = useState<any[]>([])
    const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 })

    // Activity (audit)
    const [activityQuery, setActivityQuery] = useState('')
    const [activitySearchBy, setActivitySearchBy] = useState<'phone' | 'transactionId'>('phone')
    const [activityDateFilter, setActivityDateFilter] = useState('')
    const [activityTypeFilter, setActivityTypeFilter] = useState('')
    const [activityResults, setActivityResults] = useState<any[]>([])
    const [activityMember, setActivityMember] = useState<any>(null)
    const [activityLoading, setActivityLoading] = useState(false)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

    // Lookup (explain)
    const [lookupTxId, setLookupTxId] = useState('')
    const [lookupResult, setLookupResult] = useState<any>(null)
    const [lookupLoading, setLookupLoading] = useState(false)

    // Adjust
    const [adjustPhone, setAdjustPhone] = useState('')
    const [adjustMemberId, setAdjustMemberId] = useState('')
    const [adjustMemberInfo, setAdjustMemberInfo] = useState<any>(null)
    const [adjustPoints, setAdjustPoints] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustLoading, setAdjustLoading] = useState(false)
    const [adjustResult, setAdjustResult] = useState<any>(null)

    // Auto-dismiss messages after 4s
    useEffect(() => { if (message) { const t = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(t) } }, [message])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [statsRes, topRes] = await Promise.all([
                fetch('/api/owner/loyalty?type=stats'),
                fetch('/api/owner/loyalty?type=top-members')
            ])
            if (statsRes.ok) { const d = await statsRes.json(); setProgram(d.program); setStats(d.stats) }
            if (topRes.ok) { const d = await topRes.json(); setTopMembers(d.topMembers || []) }
        } catch (e) { console.error('Fetch failed:', e) }
        finally { setLoading(false) }
    }, [])

    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch(`/api/reports/loyalty-summary?date=${summaryDate}`)
            if (res.ok) setSummary(await res.json())
        } catch (e) { console.error(e) }
    }, [summaryDate])

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch('/api/loyalty/alerts')
            if (res.ok) { const d = await res.json(); setAlerts(d.alerts || []); setAlertCounts(d.counts || { critical: 0, warning: 0, info: 0, total: 0 }) }
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { if (activeTab === 'overview') { fetchSummary(); fetchAlerts() } }, [activeTab, fetchSummary, fetchAlerts])

    const enrollMember = async () => {
        if (!enrollForm.phone) return
        setSaving(true)
        try {
            const res = await fetch('/api/owner/loyalty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enroll', ...enrollForm }) })
            if (res.ok) { setShowEnroll(false); setEnrollForm({ phone: '', email: '', name: '' }); setMessage('✓ Member enrolled'); fetchData() }
            else { const d = await res.json(); setMessage(d.error || 'Enrollment failed') }
        } catch { setMessage('Network error') }
        finally { setSaving(false) }
    }

    const updateSettings = async () => {
        if (!program) return; setSaving(true)
        try {
            const res = await fetch('/api/owner/loyalty', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(program) })
            if (res.ok) { setShowSettings(false); setMessage('✓ Settings saved'); fetchData() }
        } catch { setMessage('Save failed') }
        finally { setSaving(false) }
    }

    const toggleSmartRewards = async (enabled: boolean) => {
        if (!program) return
        const updated = { ...program, useSmartRewards: enabled }; setProgram(updated)
        try {
            await fetch('/api/owner/loyalty', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
            setMessage(enabled ? '✓ Smart Rewards on' : '✓ Smart Rewards off')
            // FIX 5a: Force re-fetch so all stats reflect the updated state
            fetchData()
        } catch { setMessage('Toggle failed') }
    }

    // ── Activity search ──
    const searchActivity = async () => {
        if (!activityQuery.trim() && !activityDateFilter) return
        setActivityLoading(true); setActivityResults([]); setActivityMember(null)
        try {
            const params = new URLSearchParams()
            if (activityQuery.trim()) params.set(activitySearchBy, activityQuery.trim())
            if (activityDateFilter) params.set('date', activityDateFilter)
            if (activityTypeFilter) params.set('type', activityTypeFilter)
            params.set('limit', '50')
            const res = await fetch(`/api/loyalty/audit?${params}`)
            if (res.ok) { const d = await res.json(); setActivityResults(d.transactions || []); setActivityMember(d.memberSummary || null) }
        } catch (e) { console.error(e) }
        finally { setActivityLoading(false) }
    }

    // ── Lookup explain ──
    const runLookup = async () => {
        if (!lookupTxId.trim()) return
        setLookupLoading(true); setLookupResult(null)
        try {
            const res = await fetch(`/api/loyalty/explain?transactionId=${encodeURIComponent(lookupTxId.trim())}`)
            if (res.ok) setLookupResult(await res.json())
        } catch (e) { console.error(e) }
        finally { setLookupLoading(false) }
    }

    // ── Adjust ──
    const lookupMember = async () => {
        if (!adjustPhone.trim()) return
        try {
            const res = await fetch(`/api/owner/loyalty?type=search&phone=${encodeURIComponent(adjustPhone)}`)
            const d = await res.json()
            if (d.members?.length > 0) { setAdjustMemberInfo(d.members[0]); setAdjustMemberId(d.members[0].id) }
            else { setAdjustMemberInfo(null); setAdjustMemberId(''); setMessage('Member not found') }
        } catch { setAdjustMemberInfo(null) }
    }

    const submitAdjust = async () => {
        if (!adjustMemberId || !adjustPoints || !adjustReason.trim()) return

        // FIX 5b: Max adjustment guard — prevents runaway point grants/removals
        const pts = parseInt(adjustPoints)
        const MAX_ADJUST = 10000
        if (isNaN(pts) || pts === 0) { setMessage('Points must be a non-zero number.'); return }
        if (Math.abs(pts) > MAX_ADJUST) { setMessage(`Adjustment capped at ±${MAX_ADJUST.toLocaleString()} pts. Contact your provider for larger corrections.`); return }

        setAdjustLoading(true); setAdjustResult(null)
        try {
            const res = await fetch('/api/loyalty/adjust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: adjustMemberId, points: pts, reason: adjustReason.trim() }) })
            const d = await res.json()
            if (res.ok) { setAdjustResult(d); setAdjustPoints(''); setAdjustReason(''); setMessage(`✓ ${d.adjustment > 0 ? '+' : ''}${d.adjustment} pts applied`) }
            else { setAdjustResult({ error: d.error }) }
        } catch { setAdjustResult({ error: 'Network error' }) }
        finally { setAdjustLoading(false) }
    }

    // ── Export helpers ──
    const downloadExport = (type: string) => {
        const date = type === 'adjustments' ? '' : summaryDate
        window.open(`/api/loyalty/export?type=${type}${date ? `&date=${date}` : ''}`, '_blank')
    }

    const tabs: { id: TabId; label: string; desc: string; icon: typeof BarChart3 }[] = [
        { id: 'overview', label: 'Dashboard', desc: 'Daily stats & alerts', icon: BarChart3 },
        { id: 'activity', label: 'Activity Log', desc: 'Transaction history', icon: Eye },
        { id: 'lookup', label: 'Point Lookup', desc: 'Explain a transaction', icon: HelpCircle },
        { id: 'adjust', label: 'Adjust Points', desc: 'Manual correction', icon: Wrench },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-4 md:p-6">
            {/* ── Vertical Scope Banner ── */}
            <div className="mb-4 bg-stone-800/60 border border-stone-700/50 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
                <Store className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span className="text-stone-400">Loyalty is <strong className="text-amber-400">Retail-only</strong> for now. Salon loyalty is not active.</span>
            </div>

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Award className="h-7 w-7 text-yellow-500" />{program?.name || 'Loyalty'}</h1>
                        <p className="text-stone-500 text-sm">Program management & reporting</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors" title="Settings"><Settings className="h-5 w-5 text-stone-400" /></button>
                    <button onClick={() => { fetchData(); if (activeTab === 'overview') { fetchSummary(); fetchAlerts() } }} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors" title="Refresh"><RefreshCw className={`h-5 w-5 text-stone-400 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => setShowEnroll(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-medium text-sm transition-colors"><Plus className="h-4 w-4" /> Enroll</button>
                </div>
            </div>

            {/* Toast */}
            {message && <div className={`mb-4 p-3 rounded-xl text-sm font-medium transition-all ${message.startsWith('✓') ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>{message}</div>}

            {/* ── Program Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard icon={User} color="yellow" label="Members" value={stats?.totalMembers?.toLocaleString() || '0'} sub={`${stats?.activeMembers || 0} active (30d)`} />
                <StatCard icon={Star} color="amber" label="Outstanding Points" value={(stats?.totalPointsOutstanding || 0).toLocaleString()} sub={`≈ ${formatCurrency((stats?.totalPointsOutstanding || 0) * Number(program?.redemptionRatio || 0.01))} value`} />
                <StatCard icon={DollarSign} color="emerald" label="Lifetime Spend" value={formatCurrency(stats?.totalLifetimeSpend || 0)} />
                <StatCard icon={TrendingUp} color="blue" label="Lifetime Points" value={(stats?.totalLifetimePoints || 0).toLocaleString()} />
            </div>

            {/* Smart Rewards */}
            {program && <div className="mb-5"><SmartRewardsManager programId={program.id} useSmartRewards={program.useSmartRewards || false} onToggleSmartRewards={toggleSmartRewards} /></div>}

            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 mb-5 bg-stone-900/80 rounded-xl p-1 border border-stone-700 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 min-w-0 justify-center ${activeTab === tab.id ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/20' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}>
                        <tab.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden md:inline">{tab.label}</span>
                        <span className="md:hidden text-xs">{tab.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* ═══════ DASHBOARD TAB ═══════ */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {/* Date + exports */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm" />
                            <button onClick={fetchSummary} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors">Load</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => downloadExport('summary')} className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400 transition-colors" title="Export day CSV"><Download className="h-3.5 w-3.5" /> Day CSV</button>
                            <button onClick={() => downloadExport('audit')} className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400 transition-colors" title="Export audit CSV"><Download className="h-3.5 w-3.5" /> Audit CSV</button>
                        </div>
                    </div>

                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /> Alerts ({alertCounts.total})</h3>
                            {alerts.slice(0, 5).map(a => (
                                <div key={a.id} className={`rounded-xl p-3 text-sm flex items-start gap-3 ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/20' : a.severity === 'WARNING' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                                    <ShieldAlert className={`h-4 w-4 mt-0.5 flex-shrink-0 ${a.severity === 'CRITICAL' ? 'text-red-400' : a.severity === 'WARNING' ? 'text-amber-400' : 'text-blue-400'}`} />
                                    <div><p className="font-medium">{a.title}</p><p className="text-xs text-stone-400 mt-0.5">{a.detail}</p></div>
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold ${a.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : a.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{a.severity}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {!summary && <EmptyState icon={BarChart3} title="No data for this date" subtitle="Select a date and click Load to view the daily summary." />}

                    {summary && <>
                        {/* KPI row */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <KpiCard label="Points Earned" value={`+${(summary.pointsIssuedToday?.total || 0).toLocaleString()}`} sub={`${summary.pointsIssuedToday?.count || 0} transactions`} color="emerald" />
                            <KpiCard label="Points Redeemed" value={`-${(summary.pointsRedeemedToday?.total || 0).toLocaleString()}`} sub={`${summary.pointsRedeemedToday?.count || 0} redemptions`} color="red" />
                            <KpiCard label="Excluded Spend" value={formatCurrency(summary.excludedAmountToday || 0)} sub="Tobacco, lottery, etc." color="amber" />
                            <KpiCard label="Eligible Spend" value={formatCurrency(summary.eligibleAmountToday || 0)} sub="Earning points" color="blue" />
                            <KpiCard label="Net Points" value={`${(summary.netPointsToday || 0) >= 0 ? '+' : ''}${(summary.netPointsToday || 0).toLocaleString()}`} sub={`${summary.activeMemberCount || 0} active members`} color="purple" />
                        </div>

                        {/* Rule hits */}
                        {summary.topRuleHits?.length > 0 && (
                            <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Which rules fired most today</h3>
                                <div className="space-y-2">{summary.topRuleHits.slice(0, 6).map((h: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-stone-400 truncate flex-1">{humanizeRule(h.rule)}</span>
                                        <span className="text-xs text-stone-500 mx-3">{h.count} items</span>
                                        <span className="font-medium text-yellow-400">+{h.totalPoints.toLocaleString()} pts</span>
                                    </div>
                                ))}</div>
                            </div>
                        )}

                        {/* Top products */}
                        {summary.topProducts?.length > 0 && (
                            <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-green-400" /> Top earning products</h3>
                                <div className="space-y-2">{summary.topProducts.slice(0, 6).map((p: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-stone-400 truncate flex-1">{p.product}</span>
                                        <span className="text-xs text-stone-500 mx-3">{p.count}×</span>
                                        <span className="font-medium text-green-400">+{p.totalPoints.toLocaleString()} pts</span>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                    </>}

                    {/* Top members */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Gift className="h-5 w-5 text-yellow-400" /> Top Members</h3>
                        {topMembers.length === 0 ? <EmptyState icon={User} title="No members yet" subtitle="Enroll your first loyalty member to get started." /> : (
                            <div className="space-y-2">{topMembers.slice(0, 10).map((m, i) => (
                                <div key={m.id} className="flex items-center gap-3 p-3 bg-stone-800/80 rounded-xl">
                                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-stone-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-stone-700 text-stone-400'}`}>{i + 1}</div>
                                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{m.name || m.phone}</p><p className="text-xs text-stone-500">{m.phone}</p></div>
                                    <div className="text-right"><p className="font-bold text-yellow-400 text-sm">{m.pointsBalance?.toLocaleString()} pts</p></div>
                                </div>
                            ))}</div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ ACTIVITY TAB ═══════ */}
            {activeTab === 'activity' && (
                <div className="space-y-4">
                    <p className="text-sm text-stone-500">Search loyalty transactions by member phone or sale ID. Use filters to narrow results.</p>
                    <div className="flex flex-wrap gap-2">
                        <select value={activitySearchBy} onChange={e => setActivitySearchBy(e.target.value as any)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm">
                            <option value="phone">Phone #</option>
                            <option value="transactionId">Sale ID</option>
                        </select>
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input value={activityQuery} onChange={e => setActivityQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchActivity()}
                                placeholder={activitySearchBy === 'phone' ? 'e.g. 555-123-4567' : 'e.g. sale_abc123'}
                                className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm" />
                        </div>
                        <input type="date" value={activityDateFilter} onChange={e => setActivityDateFilter(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm" />
                        <select value={activityTypeFilter} onChange={e => setActivityTypeFilter(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm">
                            <option value="">All types</option>
                            <option value="EARN">Earned</option>
                            <option value="REDEEM">Redeemed</option>
                            <option value="ADJUST">Adjusted</option>
                        </select>
                        <button onClick={searchActivity} disabled={activityLoading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{activityLoading ? 'Searching…' : 'Search'}</button>
                    </div>

                    {/* Member card */}
                    {activityMember && (
                        <div className="bg-blue-900/15 border border-blue-500/25 rounded-xl p-4 flex items-center justify-between">
                            <div><p className="font-bold">{activityMember.name || activityMember.phone}</p><p className="text-sm text-stone-400">{activityMember.phone} · {activityMember.transactionCount} transactions</p></div>
                            <div className="text-right"><p className="text-xl font-bold text-yellow-400">{activityMember.pointsBalance.toLocaleString()} pts</p><p className="text-xs text-stone-500">Lifetime: {formatCurrency(activityMember.lifetimeSpend)}</p></div>
                        </div>
                    )}

                    {/* Export button when results exist */}
                    {activityResults.length > 0 && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-stone-500">{activityResults.length} results</p>
                            <button onClick={() => downloadExport('audit')} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400"><Download className="h-3 w-3" /> Export</button>
                        </div>
                    )}

                    {/* Results */}
                    {activityResults.length === 0 && !activityLoading && (
                        <EmptyState icon={Eye} title="Search for activity" subtitle="Enter a member phone number or sale transaction ID above, then click Search." />
                    )}

                    {activityResults.map(tx => (
                        <div key={tx.id} className="bg-stone-900/80 border border-stone-700 rounded-xl overflow-hidden">
                            <div className="p-3 md:p-4 flex items-center justify-between cursor-pointer hover:bg-stone-800/50 transition-colors" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <TypeBadge type={tx.type} />
                                    <span className={`font-bold text-sm ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.points >= 0 ? '+' : ''}{tx.points}</span>
                                    <span className="text-xs text-stone-500 hidden md:inline">{new Date(tx.createdAt).toLocaleString()}</span>
                                    <span className="text-xs text-stone-500 md:hidden">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                </div>
                                {expandedRow === tx.id ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                            </div>
                            {expandedRow === tx.id && (
                                <div className="border-t border-stone-700 p-4 bg-stone-950/50 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        <LabelValue label="Description" value={tx.description || '—'} />
                                        <LabelValue label="Sale ID" value={tx.transactionId || '—'} mono />
                                        <LabelValue label="Eligible spend" value={formatCurrency(tx.metadata?.eligibleTotal || 0)} color="emerald" />
                                        <LabelValue label="Excluded spend" value={formatCurrency(tx.metadata?.excludedTotal || 0)} color="amber" />
                                        <LabelValue label="Engine" value={tx.metadata?.smartRewardsActive ? `Smart Rewards (${tx.metadata.rulesCount} rules)` : 'Flat rate'} />
                                    </div>
                                    {tx.metadata?.breakdown?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-stone-400 mb-2">What happened per item:</p>
                                            <div className="space-y-1">{tx.metadata.breakdown.map((b: any, i: number) => (
                                                <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${b.excluded ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                                                    <span className="font-medium">{b.itemName}</span> — {b.excluded ? `not earning (${b.reason || b.ruleApplied})` : `+${b.points} pts via ${humanizeRule(b.ruleApplied)}`}
                                                </div>
                                            ))}</div>
                                        </div>
                                    )}
                                    {!tx.hasMetadata && <p className="text-xs text-stone-600 italic">No item-level detail available (older transaction)</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════ LOOKUP TAB ═══════ */}
            {activeTab === 'lookup' && (
                <div className="space-y-4 max-w-2xl">
                    <p className="text-sm text-stone-500">Enter a sale transaction ID to see exactly how loyalty points were calculated — which items earned, which were excluded, and why.</p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input value={lookupTxId} onChange={e => setLookupTxId(e.target.value)} onKeyDown={e => e.key === 'Enter' && runLookup()}
                                placeholder="Paste a sale transaction ID here…"
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm" />
                        </div>
                        <button onClick={runLookup} disabled={lookupLoading} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{lookupLoading ? 'Looking up…' : 'Explain'}</button>
                    </div>

                    {!lookupResult && !lookupLoading && <EmptyState icon={HelpCircle} title="Point Lookup" subtitle="Paste a sale ID from a receipt or POS record to see the full loyalty breakdown for that transaction." />}

                    {lookupResult && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TypeBadge type={lookupResult.type} />
                                    {lookupResult.member && <span className="text-sm text-stone-300">{lookupResult.member.name || lookupResult.member.phone}</span>}
                                </div>
                                {lookupResult.points !== undefined && <span className="text-xl font-bold text-yellow-400">{lookupResult.points >= 0 ? '+' : ''}{lookupResult.points} pts</span>}
                            </div>

                            <div className="space-y-2">{lookupResult.explanation?.map((e: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <span className="px-2 py-0.5 bg-stone-800 text-stone-400 text-xs rounded font-medium shrink-0">{humanizeAction(e.action)}</span>
                                    <span className="text-stone-300">{e.detail}</span>
                                </div>
                            ))}</div>

                            {lookupResult.itemBreakdown?.length > 0 && (
                                <div className="border-t border-stone-700 pt-3">
                                    <p className="text-xs font-semibold text-stone-400 mb-2">Per-item detail:</p>
                                    <div className="space-y-1.5">{lookupResult.itemBreakdown.map((b: any, i: number) => (
                                        <div key={i} className={`text-sm px-3 py-2 rounded-lg ${b.excluded ? 'bg-red-500/10 border border-red-500/15' : 'bg-emerald-500/10 border border-emerald-500/15'}`}>
                                            <span className="font-medium">{b.itemName}</span>
                                            <span className="ml-2 text-xs text-stone-400">{b.excluded ? `Not earning — ${b.reason || 'excluded category'}` : `+${b.points} pts via ${humanizeRule(b.rule)}`}</span>
                                        </div>
                                    ))}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ ADJUST TAB ═══════ */}
            {activeTab === 'adjust' && (
                <div className="max-w-lg space-y-4">
                    <div className="bg-amber-900/15 border border-amber-500/25 rounded-xl p-3 text-sm text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>All adjustments are permanently logged. Your name and reason will be recorded.</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-stone-500">Add or remove points for a member with a documented reason.</p>
                        <button onClick={() => downloadExport('adjustments')} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400"><Download className="h-3 w-3" /> History CSV</button>
                    </div>

                    <div>
                        <label className="text-sm text-stone-400 font-medium">Member phone number</label>
                        <div className="flex gap-2 mt-1">
                            <input value={adjustPhone} onChange={e => setAdjustPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupMember()} placeholder="e.g. 555-123-4567" className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                            <button onClick={lookupMember} className="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm transition-colors">Find</button>
                        </div>
                    </div>

                    {adjustMemberInfo && (
                        <div className="bg-stone-800/80 rounded-xl p-3 flex items-center justify-between border border-stone-700/50">
                            <div><p className="font-medium">{adjustMemberInfo.name || adjustMemberInfo.phone}</p><p className="text-xs text-stone-500">{adjustMemberInfo.phone}</p></div>
                            <p className="text-lg font-bold text-yellow-400">{adjustMemberInfo.pointsBalance.toLocaleString()} pts</p>
                        </div>
                    )}

                    {!adjustMemberInfo && <EmptyState icon={User} title="Find a member first" subtitle="Enter their phone number above and click Find." small />}

                    {adjustMemberInfo && <>
                        <div>
                            <label className="text-sm text-stone-400 font-medium">How many points?</label>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => setAdjustPoints(p => p.startsWith('-') ? p.slice(1) : '-' + p)} className="px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg">
                                    {adjustPoints.startsWith('-') ? <MinusCircle className="h-4 w-4 text-red-400" /> : <PlusCircle className="h-4 w-4 text-emerald-400" />}
                                </button>
                                <input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="50" className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                            </div>
                            <p className="text-xs text-stone-600 mt-1">{adjustPoints.startsWith('-') ? 'Removing' : 'Adding'} points. Click the ± icon to toggle.</p>
                        </div>
                        <div>
                            <label className="text-sm text-stone-400 font-medium">Why? (required)</label>
                            <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Customer missed points on 3/29 purchase — receipt confirmed" rows={2} className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                        </div>
                        <button onClick={submitAdjust} disabled={adjustLoading || !adjustPoints || !adjustReason.trim()} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{adjustLoading ? 'Processing…' : 'Apply Adjustment'}</button>
                    </>}

                    {adjustResult && !adjustResult.error && (
                        <div className="bg-emerald-900/15 border border-emerald-500/20 rounded-xl p-4 text-sm">
                            <p className="text-emerald-400 font-medium">✓ Adjustment applied</p>
                            <p className="text-stone-400 mt-1">{adjustResult.previousBalance} → {adjustResult.newBalance} pts ({adjustResult.adjustment > 0 ? '+' : ''}{adjustResult.adjustment})</p>
                        </div>
                    )}
                    {adjustResult?.error && <div className="bg-red-900/15 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{adjustResult.error}</div>}
                </div>
            )}

            {/* ── Enroll Modal ── */}
            {showEnroll && (
                <Modal title="Enroll New Member" onClose={() => setShowEnroll(false)}>
                    <div className="space-y-4">
                        <Field label="Phone *"><input type="tel" value={enrollForm.phone} onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })} placeholder="(555) 123-4567" /></Field>
                        <Field label="Name"><input type="text" value={enrollForm.name} onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })} placeholder="Optional" /></Field>
                        <Field label="Email"><input type="email" value={enrollForm.email} onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })} placeholder="Optional" /></Field>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setShowEnroll(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">Cancel</button>
                        <button onClick={enrollMember} disabled={saving || !enrollForm.phone} className="flex-1 py-3 bg-yellow-600 rounded-xl font-medium disabled:opacity-50">{saving ? 'Enrolling…' : 'Enroll'}</button>
                    </div>
                </Modal>
            )}

            {/* ── Settings Modal ── */}
            {showSettings && program && (
                <Modal title="Program Settings" onClose={() => setShowSettings(false)}>
                    <div className="space-y-4">
                        <Field label="Program Name"><input type="text" value={program.name} onChange={e => setProgram({ ...program, name: e.target.value })} /></Field>
                        <Field label="Points per Dollar"><input type="number" step="0.1" value={program.pointsPerDollar} onChange={e => setProgram({ ...program, pointsPerDollar: parseFloat(e.target.value) })} /></Field>
                        <Field label="Redemption Value ($/point)"><input type="number" step="0.001" value={program.redemptionRatio} onChange={e => setProgram({ ...program, redemptionRatio: parseFloat(e.target.value) })} /><p className="text-xs text-stone-500 mt-1">100 pts = {formatCurrency(100 * program.redemptionRatio)}</p></Field>
                        <label className="flex items-center gap-3"><input type="checkbox" checked={program.isEnabled} onChange={e => setProgram({ ...program, isEnabled: e.target.checked })} className="rounded" /><span>Program Enabled</span></label>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">Cancel</button>
                        <button onClick={updateSettings} disabled={saving} className="flex-1 py-3 bg-yellow-600 rounded-xl font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ── Sub-components ──

function StatCard({ icon: Icon, color, label, value, sub }: { icon: any; color: string; label: string; value: string; sub?: string }) {
    const colors: Record<string, string> = {
        yellow: 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/25',
        amber: 'from-amber-600/10 to-stone-900/50 border-stone-700',
        emerald: 'from-emerald-600/10 to-stone-900/50 border-stone-700',
        blue: 'from-blue-600/10 to-stone-900/50 border-stone-700',
    }
    const iconColors: Record<string, string> = { yellow: 'text-yellow-400', amber: 'text-amber-400', emerald: 'text-emerald-400', blue: 'text-blue-400' }
    return (
        <div className={`bg-gradient-to-br ${colors[color] || colors.amber} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1.5"><Icon className={`h-4 w-4 ${iconColors[color]}`} /><span className="text-xs text-stone-400">{label}</span></div>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
        </div>
    )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    const bg: Record<string, string> = { emerald: 'bg-emerald-900/15 border-emerald-500/25', red: 'bg-red-900/15 border-red-500/25', amber: 'bg-amber-900/15 border-amber-500/25', blue: 'bg-blue-900/15 border-blue-500/25', purple: 'bg-purple-900/15 border-purple-500/25' }
    const txt: Record<string, string> = { emerald: 'text-emerald-300', red: 'text-red-300', amber: 'text-amber-300', blue: 'text-blue-300', purple: 'text-purple-300' }
    const val: Record<string, string> = { emerald: 'text-emerald-400', red: 'text-red-400', amber: 'text-amber-400', blue: 'text-blue-400', purple: 'text-purple-400' }
    return (
        <div className={`${bg[color]} border rounded-xl p-4`}>
            <p className={`${txt[color]} text-xs font-medium mb-1`}>{label}</p>
            <p className={`text-2xl font-bold ${val[color]}`}>{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{sub}</p>
        </div>
    )
}

function TypeBadge({ type }: { type: string }) {
    const styles: Record<string, string> = { EARN: 'bg-emerald-500/20 text-emerald-400', REDEEM: 'bg-red-500/20 text-red-400', ADJUST: 'bg-amber-500/20 text-amber-400', NONE: 'bg-stone-500/20 text-stone-400' }
    return <span className={`px-2 py-0.5 text-xs font-bold rounded ${styles[type] || styles.NONE}`}>{type}</span>
}

function EmptyState({ icon: Icon, title, subtitle, small }: { icon: any; title: string; subtitle: string; small?: boolean }) {
    return (
        <div className={`text-center ${small ? 'py-4' : 'py-10'} text-stone-500`}>
            <Icon className={`${small ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-3 opacity-40`} />
            <p className="font-medium">{title}</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">{subtitle}</p>
        </div>
    )
}

function LabelValue({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
    const colorClass = color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-stone-300'
    return <div><span className="text-stone-500">{label}:</span> <span className={`${colorClass} ${mono ? 'font-mono' : ''}`}>{value}</span></div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-stone-900 rounded-2xl w-full max-w-md border border-stone-700">
                <div className="p-5 border-b border-stone-700"><h2 className="text-xl font-bold">{title}</h2></div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="text-sm text-stone-400 font-medium">{label}</label><div className="mt-1 [&>input]:w-full [&>input]:bg-stone-800 [&>input]:border [&>input]:border-stone-700 [&>input]:rounded-xl [&>input]:px-4 [&>input]:py-3 [&>input]:text-sm">{children}</div></div>
}

// ── Helpers ──

function humanizeRule(rule: string): string {
    if (!rule) return 'Unknown'
    if (rule === 'GLOBAL_DEFAULT') return 'Default rate'
    if (rule === 'FLAT_RATE') return 'Flat rate'
    if (rule === 'BUILT_IN_EXCLUSION') return 'System exclusion'
    if (rule.startsWith('CATEGORY:')) return rule.replace('CATEGORY:', '').trim()
    if (rule.startsWith('PRODUCT:')) return rule.replace('PRODUCT:', '').trim()
    if (rule.startsWith('EXCLUSION:')) return `Excluded: ${rule.replace('EXCLUSION:', '').trim()}`
    return rule
}

function humanizeAction(action: string): string {
    const map: Record<string, string> = { EARN: 'Earned', REDEEM: 'Redeemed', ENGINE: 'Engine', TOTALS: 'Totals', NO_LOYALTY: 'None', DISABLED: 'Off' }
    return map[action] || action
}
