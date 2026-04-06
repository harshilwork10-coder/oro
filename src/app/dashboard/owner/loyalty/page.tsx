'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Award, RefreshCw, Search, Plus, Star, User, DollarSign,
    TrendingUp, Settings, Gift, Shield, Eye, Wrench, ChevronDown, ChevronUp,
    AlertTriangle, FileText, Zap, MinusCircle, PlusCircle, BarChart3, Tag,
    Download, Bell, Info, ShieldAlert, HelpCircle, Store, Trash2, ToggleLeft,
    ToggleRight, Coins, Trophy, Lock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import SmartRewardsManager from '@/components/loyalty/SmartRewardsManager'

type TabId = 'overview' | 'earn' | 'redeem' | 'members'

interface Stats {
    totalMembers: number; activeMembers: number; totalPointsOutstanding: number
    totalLifetimePoints: number; totalLifetimeSpend: number
}

interface RedeemTier {
    id: string; name: string; pointsRequired: number; rewardType: string
    rewardValue: number; minBasketAmount: number | null; maxPerDay: number | null
    isActive: boolean; sortOrder: number
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

    // Redeem tiers
    const [redeemTiers, setRedeemTiers] = useState<RedeemTier[]>([])
    const [showAddTier, setShowAddTier] = useState(false)
    const [tierForm, setTierForm] = useState({ name: '', pointsRequired: '', rewardType: 'AMOUNT_OFF', rewardValue: '', minBasketAmount: '', maxPerDay: '' })

    // Members (merged view)
    const [memberQuery, setMemberQuery] = useState('')
    const [selectedMember, setSelectedMember] = useState<any>(null)
    const [memberActivity, setMemberActivity] = useState<any[]>([])
    const [memberLoading, setMemberLoading] = useState(false)
    const [adjustPoints, setAdjustPoints] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustLoading, setAdjustLoading] = useState(false)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

    // Auto-dismiss messages
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

    const fetchRedeemTiers = useCallback(async () => {
        try {
            const res = await fetch('/api/loyalty/redeem-tiers')
            if (res.ok) { const d = await res.json(); setRedeemTiers(d.tiers || []) }
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { if (activeTab === 'overview') { fetchSummary(); fetchAlerts() } }, [activeTab, fetchSummary, fetchAlerts])
    useEffect(() => { if (activeTab === 'redeem') fetchRedeemTiers() }, [activeTab, fetchRedeemTiers])

    const toggleSmartRewards = async (enabled: boolean) => {
        if (!program) return
        const updated = { ...program, useSmartRewards: enabled }; setProgram(updated)
        try {
            await fetch('/api/owner/loyalty', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
            setMessage(enabled ? '✓ Smart Rewards on' : '✓ Smart Rewards off')
            fetchData()
        } catch { setMessage('Toggle failed') }
    }

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

    // ── Redeem tier actions ──
    const addTier = async () => {
        if (!tierForm.name || !tierForm.pointsRequired || !tierForm.rewardValue) return
        setSaving(true)
        try {
            const res = await fetch('/api/loyalty/redeem-tiers', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tierForm),
            })
            if (res.ok) { setShowAddTier(false); setTierForm({ name: '', pointsRequired: '', rewardType: 'AMOUNT_OFF', rewardValue: '', minBasketAmount: '', maxPerDay: '' }); setMessage('✓ Tier created'); fetchRedeemTiers() }
            else { const d = await res.json(); setMessage(d.error || 'Failed') }
        } catch { setMessage('Network error') }
        finally { setSaving(false) }
    }

    const toggleTier = async (id: string, isActive: boolean) => {
        try {
            await fetch('/api/loyalty/redeem-tiers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: !isActive }) })
            fetchRedeemTiers()
        } catch { setMessage('Toggle failed') }
    }

    const deleteTier = async (id: string) => {
        if (!confirm('Delete this redemption tier?')) return
        try {
            await fetch(`/api/loyalty/redeem-tiers?id=${id}`, { method: 'DELETE' })
            fetchRedeemTiers(); setMessage('✓ Tier deleted')
        } catch { setMessage('Delete failed') }
    }

    // ── Members merged view ──
    const searchMember = async () => {
        if (!memberQuery.trim()) return
        setMemberLoading(true); setSelectedMember(null); setMemberActivity([])
        try {
            const res = await fetch(`/api/owner/loyalty?type=search&phone=${encodeURIComponent(memberQuery)}`)
            const d = await res.json()
            if (d.members?.length > 0) {
                setSelectedMember(d.members[0])
                // Fetch activity
                const actRes = await fetch(`/api/loyalty/audit?phone=${encodeURIComponent(memberQuery)}&limit=20`)
                if (actRes.ok) { const ad = await actRes.json(); setMemberActivity(ad.transactions || []) }
            } else { setMessage('Member not found') }
        } catch { setMessage('Search failed') }
        finally { setMemberLoading(false) }
    }

    const submitAdjust = async () => {
        if (!selectedMember || !adjustPoints || !adjustReason.trim()) return
        const pts = parseInt(adjustPoints)
        if (isNaN(pts) || pts === 0) { setMessage('Points must be a non-zero number.'); return }
        if (Math.abs(pts) > 10000) { setMessage('Adjustment capped at ±10,000 pts.'); return }

        setAdjustLoading(true)
        try {
            const res = await fetch('/api/loyalty/adjust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: selectedMember.id, points: pts, reason: adjustReason.trim() }) })
            const d = await res.json()
            if (res.ok) {
                setMessage(`✓ ${d.adjustment > 0 ? '+' : ''}${d.adjustment} pts applied`)
                setAdjustPoints(''); setAdjustReason('')
                // Refresh member
                searchMember()
            } else { setMessage(d.error || 'Adjust failed') }
        } catch { setMessage('Network error') }
        finally { setAdjustLoading(false) }
    }

    const downloadExport = (type: string) => {
        const date = type === 'adjustments' ? '' : summaryDate
        window.open(`/api/loyalty/export?type=${type}${date ? `&date=${date}` : ''}`, '_blank')
    }

    const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'earn', label: 'Earn Rules', icon: Zap },
        { id: 'redeem', label: 'Redeem Rules', icon: Gift },
        { id: 'members', label: 'Members', icon: User },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-4 md:p-6">
            {/* Vertical Scope */}
            <div className="mb-4 bg-stone-800/60 border border-stone-700/50 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
                <Store className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span className="text-stone-400">Loyalty is <strong className="text-amber-400">Retail-only</strong> for now. Salon loyalty is not active.</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Award className="h-7 w-7 text-yellow-500" />{program?.name || 'Loyalty'}</h1>
                        <p className="text-stone-500 text-sm">Program management & reporting</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors" title="Program Settings"><Settings className="h-5 w-5 text-stone-400" /></button>
                    <button onClick={() => { fetchData(); if (activeTab === 'overview') { fetchSummary(); fetchAlerts() } }} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors" title="Refresh"><RefreshCw className={`h-5 w-5 text-stone-400 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => setShowEnroll(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-medium text-sm transition-colors"><Plus className="h-4 w-4" /> Enroll</button>
                </div>
            </div>

            {/* Toast */}
            {message && <div className={`mb-4 p-3 rounded-xl text-sm font-medium transition-all ${message.startsWith('✓') ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>{message}</div>}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard icon={User} color="yellow" label="Members" value={stats?.totalMembers?.toLocaleString() || '0'} sub={`${stats?.activeMembers || 0} active (30d)`} />
                <StatCard icon={Star} color="amber" label="Outstanding Points" value={(stats?.totalPointsOutstanding || 0).toLocaleString()} sub={`≈ ${formatCurrency((stats?.totalPointsOutstanding || 0) * Number(program?.redemptionRatio || 0.01))} value`} />
                <StatCard icon={DollarSign} color="emerald" label="Lifetime Spend" value={formatCurrency(stats?.totalLifetimeSpend || 0)} />
                <StatCard icon={TrendingUp} color="blue" label="Lifetime Points" value={(stats?.totalLifetimePoints || 0).toLocaleString()} />
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-5 bg-stone-900/80 rounded-xl p-1 border border-stone-700 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 min-w-0 justify-center ${activeTab === tab.id ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/20' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}>
                        <tab.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* ═══════ OVERVIEW TAB ═══════ */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm" />
                            <button onClick={fetchSummary} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors">Load</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => downloadExport('summary')} className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400 transition-colors"><Download className="h-3.5 w-3.5" /> Day CSV</button>
                            <button onClick={() => downloadExport('audit')} className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-400 transition-colors"><Download className="h-3.5 w-3.5" /> Audit CSV</button>
                        </div>
                    </div>

                    {alerts.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /> Alerts ({alertCounts.total})</h3>
                            {alerts.slice(0, 5).map(a => (
                                <div key={a.id} className={`rounded-xl p-3 text-sm flex items-start gap-3 ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/20' : a.severity === 'WARNING' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                                    <ShieldAlert className={`h-4 w-4 mt-0.5 flex-shrink-0 ${a.severity === 'CRITICAL' ? 'text-red-400' : a.severity === 'WARNING' ? 'text-amber-400' : 'text-blue-400'}`} />
                                    <div><p className="font-medium">{a.title}</p><p className="text-xs text-stone-400 mt-0.5">{a.detail}</p></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!summary && <EmptyState icon={BarChart3} title="No data for this date" subtitle="Select a date and click Load to view the daily summary." />}

                    {summary && <>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <KpiCard label="Points Earned" value={`+${(summary.pointsIssuedToday?.total || 0).toLocaleString()}`} sub={`${summary.pointsIssuedToday?.count || 0} transactions`} color="emerald" />
                            <KpiCard label="Points Redeemed" value={`-${(summary.pointsRedeemedToday?.total || 0).toLocaleString()}`} sub={`${summary.pointsRedeemedToday?.count || 0} redemptions`} color="red" />
                            <KpiCard label="Excluded Spend" value={formatCurrency(summary.excludedAmountToday || 0)} sub="Tobacco, lottery, etc." color="amber" />
                            <KpiCard label="Eligible Spend" value={formatCurrency(summary.eligibleAmountToday || 0)} sub="Earning points" color="blue" />
                            <KpiCard label="Net Points" value={`${(summary.netPointsToday || 0) >= 0 ? '+' : ''}${(summary.netPointsToday || 0).toLocaleString()}`} sub={`${summary.activeMemberCount || 0} active members`} color="purple" />
                        </div>

                        {summary.topRuleHits?.length > 0 && (
                            <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Top rules today</h3>
                                <div className="space-y-2">{summary.topRuleHits.slice(0, 6).map((h: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-stone-400 truncate flex-1">{humanizeRule(h.rule)}</span>
                                        <span className="text-xs text-stone-500 mx-3">{h.count} items</span>
                                        <span className="font-medium text-yellow-400">+{h.totalPoints.toLocaleString()} pts</span>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                    </>}

                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /> Top Members</h3>
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

            {/* ═══════ EARN RULES TAB ═══════ */}
            {activeTab === 'earn' && (
                <div className="space-y-4">
                    <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-red-400" /> Always Excluded (Read-Only)</h3>
                        <p className="text-xs text-stone-500 mb-3">These categories never earn loyalty points. This cannot be changed.</p>
                        <div className="flex flex-wrap gap-2">
                            {['Tobacco', 'Lottery', 'Gift Cards'].map(cat => (
                                <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium">
                                    <Lock className="h-3 w-3" />{cat}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-stone-300">Base Earn Rate</h3>
                                <p className="text-xs text-stone-500 mt-0.5">All eligible purchases earn at this rate unless overridden by a Smart Rewards rule below.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-yellow-400">{Number(program?.pointsPerDollar || 1)} pt</p>
                                <p className="text-xs text-stone-500">per $1 spent</p>
                            </div>
                        </div>
                    </div>

                    {program && <SmartRewardsManager programId={program.id} useSmartRewards={program.useSmartRewards || false} onToggleSmartRewards={toggleSmartRewards} />}
                </div>
            )}

            {/* ═══════ REDEEM RULES TAB ═══════ */}
            {activeTab === 'redeem' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2"><Gift className="h-5 w-5 text-purple-400" /> Redemption Tiers</h3>
                            <p className="text-sm text-stone-500 mt-0.5">Define how many points customers need for each reward level.</p>
                        </div>
                        <button onClick={() => setShowAddTier(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium text-sm transition-colors">
                            <Plus className="h-4 w-4" /> Add Tier
                        </button>
                    </div>

                    {redeemTiers.length === 0 && !showAddTier && (
                        <EmptyState icon={Gift} title="No redemption tiers yet" subtitle='Click "Add Tier" to create your first reward level. Example: 100 points = $10 off.' />
                    )}

                    {/* Existing tiers */}
                    <div className="space-y-3">
                        {redeemTiers.sort((a, b) => a.pointsRequired - b.pointsRequired).map((tier, i) => (
                            <div key={tier.id} className={`bg-stone-900/80 border rounded-xl p-4 transition-all ${tier.isActive ? 'border-purple-500/30' : 'border-stone-700 opacity-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                                            <Coins className="h-6 w-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{tier.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-yellow-400 font-bold">{tier.pointsRequired.toLocaleString()} pts</span>
                                                <span className="text-stone-500">→</span>
                                                <span className="text-emerald-400 font-bold">
                                                    {tier.rewardType === 'AMOUNT_OFF' ? formatCurrency(tier.rewardValue) + ' off' :
                                                     tier.rewardType === 'PERCENT_OFF' ? tier.rewardValue + '% off' : 'Free Item'}
                                                </span>
                                            </div>
                                            {tier.minBasketAmount && <p className="text-xs text-stone-500 mt-0.5">Min basket: {formatCurrency(tier.minBasketAmount)}</p>}
                                            {tier.maxPerDay && <p className="text-xs text-stone-500">Max {tier.maxPerDay}/day per member</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleTier(tier.id, tier.isActive)} className="p-1.5 hover:bg-stone-800 rounded-lg" title={tier.isActive ? 'Disable' : 'Enable'}>
                                            {tier.isActive ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5 text-stone-600" />}
                                        </button>
                                        <button onClick={() => deleteTier(tier.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-stone-500 hover:text-red-400">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add tier form */}
                    {showAddTier && (
                        <div className="bg-stone-900/80 border border-purple-500/30 rounded-xl p-5 space-y-4">
                            <h4 className="font-bold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-purple-400" /> New Redemption Tier</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-stone-400">Tier Name *</label>
                                    <input value={tierForm.name} onChange={e => setTierForm({ ...tierForm, name: e.target.value })} placeholder='e.g. "Bronze Reward"' className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400">Points Required *</label>
                                    <input type="number" value={tierForm.pointsRequired} onChange={e => setTierForm({ ...tierForm, pointsRequired: e.target.value })} placeholder="100" className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-stone-400">Reward Type</label>
                                    <select value={tierForm.rewardType} onChange={e => setTierForm({ ...tierForm, rewardType: e.target.value })} className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm">
                                        <option value="AMOUNT_OFF">$ Amount Off</option>
                                        <option value="PERCENT_OFF">% Discount</option>
                                        <option value="FREE_ITEM">Free Item</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400">Reward Value *</label>
                                    <input type="number" step="0.01" value={tierForm.rewardValue} onChange={e => setTierForm({ ...tierForm, rewardValue: e.target.value })} placeholder="10.00" className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-400">Min Basket (optional)</label>
                                    <input type="number" step="0.01" value={tierForm.minBasketAmount} onChange={e => setTierForm({ ...tierForm, minBasketAmount: e.target.value })} placeholder="—" className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAddTier(false)} className="flex-1 py-2.5 bg-stone-800 rounded-lg text-sm">Cancel</button>
                                <button onClick={addTier} disabled={saving || !tierForm.name || !tierForm.pointsRequired || !tierForm.rewardValue} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{saving ? 'Creating…' : 'Create Tier'}</button>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {redeemTiers.length > 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                            <h4 className="text-xs font-semibold text-stone-400 mb-3">CUSTOMER VIEW PREVIEW</h4>
                            <div className="flex flex-wrap gap-3">
                                {redeemTiers.filter(t => t.isActive).sort((a, b) => a.pointsRequired - b.pointsRequired).map(tier => (
                                    <div key={tier.id} className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/25 rounded-xl px-4 py-3 text-center">
                                        <p className="text-xs text-stone-400">{tier.name}</p>
                                        <p className="text-lg font-bold text-yellow-400 mt-1">{tier.pointsRequired.toLocaleString()} pts</p>
                                        <p className="text-sm text-emerald-400 font-medium">
                                            {tier.rewardType === 'AMOUNT_OFF' ? formatCurrency(tier.rewardValue) + ' off' : tier.rewardType === 'PERCENT_OFF' ? tier.rewardValue + '% off' : 'Free Item'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ MEMBERS TAB (merged) ═══════ */}
            {activeTab === 'members' && (
                <div className="space-y-4">
                    {/* Search + Enroll */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input value={memberQuery} onChange={e => setMemberQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchMember()}
                                placeholder="Search by phone number…" className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm" />
                        </div>
                        <button onClick={searchMember} disabled={memberLoading} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{memberLoading ? 'Searching…' : 'Search'}</button>
                        <button onClick={() => setShowEnroll(true)} className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>

                    {!selectedMember && !memberLoading && (
                        <EmptyState icon={User} title="Search for a member" subtitle="Enter a phone number to view their profile, points, and activity." />
                    )}

                    {/* Member profile card */}
                    {selectedMember && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-yellow-600/10 via-stone-900 to-stone-900 border border-yellow-500/20 rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
                                            <User className="h-7 w-7 text-yellow-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{selectedMember.name || selectedMember.phone}</h3>
                                            <p className="text-sm text-stone-400">{selectedMember.phone}</p>
                                            {selectedMember.email && <p className="text-xs text-stone-500">{selectedMember.email}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-yellow-400">{selectedMember.pointsBalance?.toLocaleString()}</p>
                                        <p className="text-xs text-stone-500">Current Points</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-stone-800/60 rounded-lg p-3 text-center">
                                        <p className="text-xs text-stone-400">Lifetime Points</p>
                                        <p className="text-sm font-bold">{(selectedMember.lifetimePoints || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-stone-800/60 rounded-lg p-3 text-center">
                                        <p className="text-xs text-stone-400">Lifetime Spend</p>
                                        <p className="text-sm font-bold">{formatCurrency(selectedMember.lifetimeSpend || 0)}</p>
                                    </div>
                                    <div className="bg-stone-800/60 rounded-lg p-3 text-center">
                                        <p className="text-xs text-stone-400">Enrolled</p>
                                        <p className="text-sm font-bold">{new Date(selectedMember.enrolledAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Manual adjust card */}
                            <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-400" /> Adjust Points</h4>
                                <div className="bg-amber-900/10 border border-amber-500/15 rounded-lg px-3 py-2 mb-3 text-xs text-amber-300 flex items-start gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>All adjustments are permanently logged with your name and reason.</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setAdjustPoints(p => p.startsWith('-') ? p.slice(1) : '-' + p)} className="px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg">
                                        {adjustPoints.startsWith('-') ? <MinusCircle className="h-4 w-4 text-red-400" /> : <PlusCircle className="h-4 w-4 text-emerald-400" />}
                                    </button>
                                    <input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="Points" className="w-24 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                    <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason (required)" className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm" />
                                    <button onClick={submitAdjust} disabled={adjustLoading || !adjustPoints || !adjustReason.trim()} className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{adjustLoading ? '…' : 'Apply'}</button>
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="h-4 w-4 text-blue-400" /> Recent Activity</h4>
                                {memberActivity.length === 0 ? (
                                    <p className="text-xs text-stone-500 text-center py-4">No activity yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {memberActivity.slice(0, 15).map(tx => (
                                            <div key={tx.id} className="bg-stone-800/60 rounded-lg overflow-hidden">
                                                <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-stone-800 transition-colors" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                                                    <div className="flex items-center gap-3">
                                                        <TypeBadge type={tx.type} />
                                                        <span className={`font-bold text-sm ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.points >= 0 ? '+' : ''}{tx.points}</span>
                                                        <span className="text-xs text-stone-500">{new Date(tx.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {expandedRow === tx.id ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                                                </div>
                                                {expandedRow === tx.id && (
                                                    <div className="border-t border-stone-700 p-3 text-xs space-y-1">
                                                        {tx.description && <p className="text-stone-400">{tx.description}</p>}
                                                        {tx.transactionId && <p className="text-stone-500 font-mono">Sale: {tx.transactionId}</p>}
                                                        {tx.metadata?.breakdown?.length > 0 && (
                                                            <div className="space-y-1 mt-2">{tx.metadata.breakdown.map((b: any, i: number) => (
                                                                <div key={i} className={`px-2 py-1 rounded ${b.excluded ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                                                                    <span className="font-medium">{b.itemName}</span> — {b.excluded ? `excluded (${b.reason || b.ruleApplied})` : `+${b.points} pts`}
                                                                </div>
                                                            ))}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                        <Field label="Redemption Value ($/point)">
                            <input type="number" step="0.001" value={program.redemptionRatio} onChange={e => setProgram({ ...program, redemptionRatio: parseFloat(e.target.value) })} />
                            <p className="text-xs text-stone-500 mt-1">100 pts = {formatCurrency(100 * program.redemptionRatio)}</p>
                        </Field>
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

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
    return (
        <div className="text-center py-10 text-stone-500">
            <Icon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{title}</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">{subtitle}</p>
        </div>
    )
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
