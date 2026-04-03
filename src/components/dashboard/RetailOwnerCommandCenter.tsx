'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users, DollarSign, TrendingUp, AlertCircle, Phone, CreditCard,
    Gift, Ticket, ShieldAlert, Sparkles, ChevronDown, ChevronUp,
    Wifi, WifiOff, Receipt, ShoppingBag, ArrowRight, MapPin,
    Package, AlertTriangle, Skull, Truck, BarChart3
} from 'lucide-react'
import RequestExpansionModal from '@/components/modals/RequestExpansionModal'
import ConsultationRequestModal from '@/components/modals/ConsultationRequestModal'
import MerchantApplicationModal from '@/components/modals/MerchantApplicationModal'

interface Props {
    session: { user: { name?: string | null; role?: string | null } }
}

export default function RetailOwnerCommandCenter({ session }: Props) {
    const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false)
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
    const [isMerchantApplicationModalOpen, setIsMerchantApplicationModalOpen] = useState(false)
    const [showBusinessServices, setShowBusinessServices] = useState(false)
    const [todayStats, setTodayStats] = useState({
        visits: 0, revenue: 0, transactions: 0, itemsSold: 0,
        cashTotal: 0, cardTotal: 0, avgTicket: 0
    })
    const [lowStockItems, setLowStockItems] = useState<any[]>([])
    const [recentTransactions, setRecentTransactions] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [stations, setStations] = useState<any[]>([])
    const [briefing, setBriefing] = useState<string | null>(null)
    const [invoiceStats, setInvoiceStats] = useState<{ reviewCount: number; readyCount: number }>({ reviewCount: 0, readyCount: 0 })
    const [exceptionCount, setExceptionCount] = useState(0)
    const [approvalCount, setApprovalCount] = useState(0)
    const [openIssueCount, setOpenIssueCount] = useState(0)
    const [cashHealth, setCashHealth] = useState<any>(null)
    const [cashHealthTab, setCashHealthTab] = useState<'traps' | 'reorder' | 'freeze'>('reorder')

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/franchise/stats/today')
                if (res.ok) {
                    const data = await res.json()
                    const txnCount = data.transactions || data.services || 0
                    const rev = data.revenue || 0
                    setTodayStats({
                        visits: data.visits || 0,
                        revenue: rev,
                        transactions: txnCount,
                        itemsSold: data.itemsSold || data.services || 0,
                        cashTotal: data.cashTotal || 0,
                        cardTotal: data.cardTotal || 0,
                        avgTicket: txnCount > 0 ? rev / txnCount : 0,
                    })
                }
            } catch (error) { console.error('Error fetching stats:', error) }
        }
        const fetchLowStock = async () => {
            try {
                const res = await fetch('/api/inventory/products?lowStock=true&take=10')
                if (res.ok) {
                    const data = await res.json()
                    setLowStockItems(data.data || [])
                }
            } catch (error) { console.error('Error fetching low stock:', error) }
        }
        const fetchRecentTxns = async () => {
            try {
                const res = await fetch('/api/franchise/transactions?take=5')
                if (res.ok) {
                    const data = await res.json()
                    setRecentTransactions(data.transactions || data.data || [])
                }
            } catch (error) { console.error('Error fetching transactions:', error) }
        }
        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/franchise/employees')
                if (res.ok) {
                    const data = await res.json()
                    setEmployees(Array.isArray(data) ? data : data.employees || [])
                }
            } catch (error) { console.error('Error fetching employees:', error) }
        }
        const fetchStations = async () => {
            try {
                const res = await fetch('/api/pos/stations')
                if (res.ok) {
                    const data = await res.json()
                    setStations(Array.isArray(data) ? data : data.stations || [])
                }
            } catch (error) { console.error('Error fetching stations:', error) }
        }
        const fetchBriefing = async () => {
            try {
                const res = await fetch('/api/owner/briefing')
                if (res.ok) {
                    const data = await res.json()
                    setBriefing(data.summary || data.briefing || null)
                    // Extract structured issue counts if available
                    const issues = data.issues || data.openIssues || []
                    if (Array.isArray(issues)) setOpenIssueCount(issues.filter((i: any) => i.status === 'OPEN' || i.status === 'ESCALATED' || !i.status).length)
                    else if (typeof data.openCount === 'number') setOpenIssueCount(data.openCount)
                }
            } catch { /* Graceful - briefing is optional */ }
        }
        const fetchInvoiceStats = async () => {
            try {
                const res = await fetch('/api/invoices')
                if (res.ok) {
                    const data = await res.json()
                    const stats = data.stats || {}
                    setInvoiceStats({
                        reviewCount: stats.REVIEW_REQUIRED?.count || 0,
                        readyCount: stats.READY_TO_POST?.count || 0,
                    })
                }
            } catch { /* Graceful */ }
        }
        const fetchExceptions = async () => {
            try {
                const res = await fetch('/api/owner/exceptions')
                if (res.ok) {
                    const data = await res.json()
                    setExceptionCount(data.total || (Array.isArray(data.exceptions) ? data.exceptions.length : 0))
                }
            } catch { /* Graceful */ }
        }
        const fetchApprovals = async () => {
            try {
                const res = await fetch('/api/pos/approval-queue')
                if (res.ok) {
                    const data = await res.json()
                    setApprovalCount(data.total || (Array.isArray(data.items) ? data.items.filter((i: any) => i.status === 'PENDING').length : Array.isArray(data) ? data.length : 0))
                }
            } catch { /* Graceful */ }
        }
        fetchStats()
        fetchLowStock()
        fetchRecentTxns()
        fetchEmployees()
        fetchStations()
        fetchBriefing()
        fetchInvoiceStats()
        fetchExceptions()
        fetchApprovals()
        // Cash Health
        const fetchCashHealth = async () => {
            try {
                const res = await fetch('/api/inventory/cash-health')
                if (res.ok) setCashHealth(await res.json())
            } catch { /* Graceful */ }
        }
        fetchCashHealth()
    }, [])

    // Derived data
    const onClockEmployees = employees.filter((e: any) => e.isClockedIn || e.clockedIn)
    const onlineStations = stations.filter((s: any) => s.isOnline || s.isTrusted)
    const offlineStations = stations.filter((s: any) => !s.isOnline && !s.isTrusted && s.id)
    const nextActions: { label: string; href: string; count: number; color: string }[] = []
    if (invoiceStats.reviewCount > 0) nextActions.push({ label: 'invoices need review', href: '/dashboard/reports/invoices', count: invoiceStats.reviewCount, color: 'text-orange-400' })
    if (invoiceStats.readyCount > 0) nextActions.push({ label: 'invoices ready to post', href: '/dashboard/reports/invoices', count: invoiceStats.readyCount, color: 'text-emerald-400' })
    if (exceptionCount > 0) nextActions.push({ label: 'exceptions to review', href: '/dashboard/owner/exceptions', count: exceptionCount, color: 'text-red-400' })
    if (approvalCount > 0) nextActions.push({ label: 'pending approvals', href: '/dashboard/owner/approval-queue', count: approvalCount, color: 'text-blue-400' })
    if (openIssueCount > 0) nextActions.push({ label: 'open issues', href: '/dashboard/owner/briefing', count: openIssueCount, color: 'text-purple-400' })
    if (offlineStations.length > 0) nextActions.push({ label: 'stations offline', href: '/dashboard/settings/stations', count: offlineStations.length, color: 'text-red-400' })
    if (lowStockItems.length > 0) nextActions.push({ label: 'items to reorder', href: '/dashboard/inventory/smart-ordering', count: lowStockItems.length, color: 'text-amber-400' })

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header with Station Health */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-stone-400 mt-2">Here&apos;s your retail store today.</p>
                </div>
                {stations.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/50 border border-stone-700">
                        {offlineStations.length > 0 ? (
                            <><WifiOff className="h-4 w-4 text-red-400" /><span className="text-xs text-red-400">{offlineStations.length} offline</span></>
                        ) : (
                            <><Wifi className="h-4 w-4 text-emerald-400" /><span className="text-xs text-emerald-400">{onlineStations.length} stations online</span></>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <RequestExpansionModal isOpen={isExpansionModalOpen} onClose={() => setIsExpansionModalOpen(false)} onSuccess={() => { alert('Expansion request submitted successfully!') }} />
            <ConsultationRequestModal isOpen={isConsultationModalOpen} onClose={() => setIsConsultationModalOpen(false)} onSuccess={() => { alert('Consultation request submitted successfully!') }} />
            <MerchantApplicationModal isOpen={isMerchantApplicationModalOpen} onClose={() => setIsMerchantApplicationModalOpen(false)} onSuccess={() => { alert('Merchant application submitted successfully!') }} />

            {/* PRIMARY KPI ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/dashboard/customers" className="glass-panel p-5 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Customer Visits</p>
                            <p className="text-3xl font-bold text-stone-100 mt-1">{todayStats.visits}</p>
                            <p className="text-xs text-emerald-500 mt-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Live Today</p>
                        </div>
                        <div className="h-11 w-11 bg-stone-700/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="h-5 w-5 text-stone-300" /></div>
                    </div>
                </Link>
                <Link href="/dashboard/transactions" className="glass-panel p-5 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Transactions</p>
                            <p className="text-3xl font-bold text-stone-100 mt-1">{todayStats.transactions}</p>
                            <p className="text-xs text-emerald-500 mt-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Live Today</p>
                        </div>
                        <div className="h-11 w-11 bg-stone-700/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard className="h-5 w-5 text-stone-300" /></div>
                    </div>
                </Link>
                <Link href="/dashboard/reports" className="glass-panel p-5 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Today&apos;s Revenue</p>
                            <p className="text-3xl font-bold text-stone-100 mt-1">${todayStats.revenue.toFixed(2)}</p>
                            <p className="text-xs text-stone-500 mt-1">Live</p>
                        </div>
                        <div className="h-11 w-11 bg-stone-700/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign className="h-5 w-5 text-stone-300" /></div>
                    </div>
                </Link>
                <Link href="/dashboard/inventory/retail" className="glass-panel p-5 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Items Sold</p>
                            <p className="text-3xl font-bold text-stone-100 mt-1">{todayStats.itemsSold}</p>
                            <p className="text-xs text-stone-500 mt-1">Today</p>
                        </div>
                        <div className="h-11 w-11 bg-stone-700/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><ShoppingBag className="h-5 w-5 text-stone-300" /></div>
                    </div>
                </Link>
            </div>

            {/* SECONDARY KPI ROW - Cash/Card Split + Avg Ticket + Employees On Clock */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Cash Sales</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">${todayStats.cashTotal.toFixed(2)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${todayStats.revenue > 0 ? (todayStats.cashTotal / todayStats.revenue) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Card Sales</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">${todayStats.cardTotal.toFixed(2)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${todayStats.revenue > 0 ? (todayStats.cardTotal / todayStats.revenue) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Avg Ticket</p>
                    <p className="text-2xl font-bold text-stone-100 mt-1">${todayStats.avgTicket.toFixed(2)}</p>
                    <p className="text-xs text-stone-500 mt-1">Per transaction</p>
                </div>
                <Link href="/dashboard/employees" className="glass-panel p-4 rounded-xl hover:border-blue-500/30 transition-all">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">On Clock</p>
                    <p className="text-2xl font-bold text-stone-100 mt-1">{onClockEmployees.length}<span className="text-sm text-stone-500 font-normal"> / {employees.length}</span></p>
                    <p className="text-xs text-blue-400 mt-1 truncate">{onClockEmployees.length > 0 ? onClockEmployees.map((e: any) => e.name?.split(' ')[0]).join(', ') : 'No one clocked in'}</p>
                </Link>
            </div>

            {/* COMMAND ROW - AI Briefing + Next Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-stone-300 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Today&apos;s Briefing</h3>
                        <Link href="/dashboard/owner/briefing" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">Read More <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    <p className="text-sm text-stone-400 leading-relaxed">
                        {briefing || `Your store had ${todayStats.transactions} transactions for $${todayStats.revenue.toFixed(2)} in revenue today. ${lowStockItems.length > 0 ? `${lowStockItems.length} items are below reorder point.` : 'All stock levels are healthy.'} ${onClockEmployees.length} employee${onClockEmployees.length !== 1 ? 's' : ''} currently on clock.`}
                    </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl">
                    <h3 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orange-400" /> Action Items</h3>
                    {nextActions.length > 0 ? (
                        <div className="space-y-2">
                            {nextActions.map((action, i) => (
                                <Link key={i} href={action.href} className="flex items-center gap-3 p-2.5 bg-stone-800/50 rounded-lg hover:bg-stone-700/50 transition-colors">
                                    <span className={`text-lg font-bold ${action.color}`}>{action.count}</span>
                                    <span className="text-sm text-stone-300">{action.label}</span>
                                    <ArrowRight className="h-3 w-3 text-stone-500 ml-auto" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-stone-500">You&apos;re all caught up!</p>
                    )}
                </div>
            </div>

            {/* QUICK ACTIONS - Expanded */}
            <div className="glass-panel p-5 rounded-2xl">
                <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">Quick Actions</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <Link href="/dashboard/pos/retail" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <CreditCard className="h-5 w-5 text-orange-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Open POS</p>
                    </Link>
                    <Link href="/dashboard/inventory/retail" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <ShoppingBag className="h-5 w-5 text-blue-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Inventory</p>
                    </Link>
                    <Link href="/dashboard/deals" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <Gift className="h-5 w-5 text-pink-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Deals</p>
                    </Link>
                    <Link href="/dashboard/employees" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <Users className="h-5 w-5 text-indigo-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Employees</p>
                    </Link>
                    <Link href="/dashboard/reports" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <TrendingUp className="h-5 w-5 text-emerald-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Reports</p>
                    </Link>
                    <Link href="/dashboard/lottery" className="p-3 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center group">
                        <Ticket className="h-5 w-5 text-purple-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-stone-300">Lottery</p>
                    </Link>
                </div>
            </div>

            {/* ═══ INVENTORY CASH INTELLIGENCE ═══ */}
            {cashHealth && (
                <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-purple-400" />
                                Inventory Cash Intelligence
                            </h2>
                            <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-0.5">Money on Shelf</p>
                        </div>
                        <Link href="/dashboard/inventory/retail" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                            Manage <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* 6 KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/50">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-3.5 w-3.5 text-stone-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">Cash on Shelf</span>
                            </div>
                            <p className="text-xl font-bold text-stone-100">${(cashHealth.kpi?.costOnHand || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-amber-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">Money at Risk</span>
                            </div>
                            <p className="text-xl font-bold text-amber-400">${(cashHealth.kpi?.atRiskCost || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Skull className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">Dead Stock Cost</span>
                            </div>
                            <p className="text-xl font-bold text-red-400">${(cashHealth.kpi?.deadStockCost || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">On-Order Cost</span>
                            </div>
                            <p className="text-xl font-bold text-blue-400">${(cashHealth.kpi?.onOrderCost || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-amber-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Package className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">Low Stock SKUs</span>
                            </div>
                            <p className="text-xl font-bold text-amber-400">{cashHealth.kpi?.lowStockCount || 0}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-3 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Skull className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">No-Sale 30d SKUs</span>
                            </div>
                            <p className="text-xl font-bold text-red-400">{cashHealth.kpi?.noSale30dCount || 0}</p>
                        </div>
                    </div>

                    {/* 3-Tab Drilldown */}
                    <div className="border-t border-stone-700/50 pt-3">
                        <div className="flex gap-1 mb-3">
                            {[{ key: 'reorder' as const, label: '🟢 Reorder Now', count: cashHealth.reorderNow?.length || 0 },
                              { key: 'traps' as const, label: '💰 Cash Traps', count: cashHealth.cashTraps?.length || 0 },
                              { key: 'freeze' as const, label: '🔴 Freeze', count: cashHealth.freezeReorder?.length || 0 }].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setCashHealthTab(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        cashHealthTab === tab.key
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-stone-800/50 text-stone-500 border border-stone-700/50 hover:text-stone-300'
                                    }`}
                                >
                                    {tab.label} {tab.count > 0 && <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {(() => {
                            const list = cashHealthTab === 'reorder' ? cashHealth.reorderNow
                                : cashHealthTab === 'traps' ? cashHealth.cashTraps
                                : cashHealth.freezeReorder
                            if (!list || list.length === 0) {
                                return <div className="text-xs text-stone-500 text-center py-4">No items in this category</div>
                            }
                            return (
                                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                                    {list.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-800/50 rounded-lg border border-stone-700/30 hover:border-stone-600/50 transition-colors">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-sm font-medium text-stone-200 truncate">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-stone-500">{item.stock} on hand</span>
                                                    <span className="text-[10px] text-stone-600">•</span>
                                                    <span className="text-[10px] text-stone-500">${item.costOnHand?.toFixed(0) || '0'} cost</span>
                                                    <span className="text-[10px] text-stone-600">•</span>
                                                    <span className={`text-[10px] ${item.daysSinceLastSale > 30 ? 'text-red-400' : item.daysSinceLastSale > 14 ? 'text-yellow-400' : 'text-stone-500'}`}>
                                                        {item.daysSinceLastSale < 999 ? `${item.daysSinceLastSale}d since sale` : 'Never sold'}
                                                    </span>
                                                    <span className="text-[10px] text-stone-600">•</span>
                                                    <span className={`text-[10px] ${item.daysOfSupply < 7 ? 'text-red-400' : item.daysOfSupply < 14 ? 'text-yellow-400' : 'text-stone-500'}`}>
                                                        {item.daysOfSupply < 999 ? `${item.daysOfSupply}d supply` : '∞'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                item.reorderStatus === 'REFILL' ? 'bg-emerald-500/20 text-emerald-400' :
                                                item.reorderStatus === 'WATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                                                item.reorderStatus === 'FREEZE' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {item.suggestedAction}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* BOTTOM ROW - Low Stock + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Low Stock Alerts */}
                <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
                            {lowStockItems.length > 0 && (<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">{lowStockItems.length}</span>)}
                        </h2>
                        <Link href="/dashboard/inventory/alerts" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">View All <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    {lowStockItems.length > 0 ? (
                        <div className="space-y-2">
                            {lowStockItems.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-800/50 rounded-lg border border-stone-700/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-stone-200 truncate">{item.name}</p>
                                        <p className="text-xs text-stone-500">{item.barcode || item.sku || 'No barcode'}</p>
                                    </div>
                                    <p className={`text-sm font-bold ml-3 ${(item.stock || 0) === 0 ? 'text-red-400' : 'text-amber-400'}`}>{item.stock || 0} left</p>
                                </div>
                            ))}
                            <Link href="/dashboard/inventory/smart-ordering" className="block text-center text-xs text-orange-400 hover:text-orange-300 transition-colors pt-1">
                                Smart Ordering &rarr;
                            </Link>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-stone-500">
                            <p className="text-sm">No low stock alerts</p>
                            <p className="text-xs mt-1">Products below reorder point will appear here</p>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-blue-400" /> Recent Transactions
                        </h2>
                        <Link href="/dashboard/transactions" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">View All <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    {recentTransactions.length > 0 ? (
                        <div className="space-y-2">
                            {recentTransactions.slice(0, 5).map((txn: any) => (
                                <div key={txn.id} className="flex items-center justify-between p-2.5 bg-stone-800/50 rounded-lg border border-stone-700/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-stone-200">#{txn.receiptNumber || txn.id?.slice(-6) || '---'}</p>
                                        <p className="text-xs text-stone-500">{txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} &middot; {txn.paymentMethod || txn.type || 'Sale'}</p>
                                    </div>
                                    <p className="text-sm font-bold text-stone-100 ml-3">${(txn.total || txn.amount || 0).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-stone-500">
                            <p className="text-sm">No transactions yet today</p>
                            <p className="text-xs mt-1">Sales will appear here as they happen</p>
                        </div>
                    )}
                </div>
            </div>

            {/* BUSINESS SERVICES - Demoted to collapsible */}
            {session?.user?.role !== 'EMPLOYEE' && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <button onClick={() => setShowBusinessServices(!showBusinessServices)} className="w-full flex items-center justify-between p-4 hover:bg-stone-800/30 transition-colors">
                        <span className="text-sm font-medium text-stone-400">Business Services</span>
                        {showBusinessServices ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                    </button>
                    {showBusinessServices && (
                        <div className="px-4 pb-4 flex flex-wrap gap-3">
                            <button onClick={() => setIsMerchantApplicationModalOpen(true)} className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                <CreditCard className="h-4 w-4" /> Apply for Processing
                            </button>
                            <button onClick={() => setIsConsultationModalOpen(true)} className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                <Phone className="h-4 w-4" /> Request Consultation
                            </button>
                            <button onClick={() => setIsExpansionModalOpen(true)} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                <MapPin className="h-4 w-4" /> Request Expansion
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
