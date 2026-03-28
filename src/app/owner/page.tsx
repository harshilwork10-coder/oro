'use client';

import { useState, useEffect } from 'react';
import { useLocation } from './layout';
import {
    DollarSign, TrendingUp, ShoppingCart, Users, Calendar, Clock,
    Package, Scissors, BarChart3, ArrowUpRight, ArrowDownRight, Loader2,
    AlertCircle, AlertTriangle, Zap, ExternalLink, FileText, MapPin,
    Shield, Gift, Wallet, Truck, BookOpen, Receipt
} from 'lucide-react';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';

// KPI Card Component
function KpiCard({ title, value, change, changeType, icon: Icon }: {
    title: string;
    value: string;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
    return (
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">{title}</span>
                <Icon size={20} className="text-[var(--primary)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
            {change && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-emerald-400' :
                    changeType === 'down' ? 'text-red-400' : 'text-[var(--text-muted)]'
                    }`}>
                    {changeType === 'up' ? <ArrowUpRight size={14} /> :
                        changeType === 'down' ? <ArrowDownRight size={14} /> : null}
                    {change}
                </div>
            )}
        </div>
    );
}

// Quick Action Button
function QuickAction({ label, icon: Icon, href }: {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href: string;
}) {
    return (
        <a
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]/50 transition-all"
        >
            <Icon size={24} className="text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        </a>
    );
}

// Types for API data
interface TodayStats {
    totalRevenueToday: number;
    totalTipsToday: number;
    totalServiceRevenue: number;
    totalClients: number;
    totalTransactions: number;
    walkIns: number;
    yesterdayRevenue: number;
    changePercent: number;
}

interface RecentTransaction {
    id: string;
    total: number;
    tip: number;
    status: string;
    createdAt: string;
    client?: { firstName: string; lastName: string } | null;
}

export default function OwnerDashboard() {
    const { currentLocation } = useLocation();
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<TodayStats | null>(null);
    const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);

    // Widget states (Tickets 4-6)
    const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
    const [briefingData, setBriefingData] = useState<any>(null);
    const [exceptions, setExceptions] = useState<any>(null);
    const [onClockEmployees, setOnClockEmployees] = useState<any[]>([]);
    const [storeComparison, setStoreComparison] = useState<any>(null);

    // Sprint 13 widgets
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [pricingAlerts, setPricingAlerts] = useState<any[]>([]);
    const [nextActions, setNextActions] = useState<any[]>([]);

    // Sales trend chart data
    const [salesTrend, setSalesTrend] = useState<{ date: string; revenue: number; transactions: number }[]>([]);

    const isRetail = currentLocation?.type === 'retail' || currentLocation?.type === 'both';
    const isSalon = currentLocation?.type === 'salon' || currentLocation?.type === 'both';

    // Fetch live stats from the API
    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                // Build query params for location + period scoping
                const params = new URLSearchParams();
                if (currentLocation?.id) params.set('locationId', currentLocation.id);
                params.set('period', period);

                // Fetch scoped stats
                const statsRes = await fetch(`/api/owner/today-stats?${params.toString()}`);
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                // Fetch recent transactions (also location-scoped)
                const txParams = new URLSearchParams({ limit: '5', status: 'COMPLETED' });
                if (currentLocation?.id) txParams.set('locationId', currentLocation.id);
                const txRes = await fetch(`/api/transactions?${txParams.toString()}`);
                if (txRes.ok) {
                    const txData = await txRes.json();
                    setRecentTx(Array.isArray(txData) ? txData : txData.transactions || []);
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
            setLoading(false);
        }
        fetchStats();

        // Fetch widgets (independent of period)
        async function fetchWidgets() {
            const locParam = currentLocation?.id ? `locationId=${currentLocation.id}` : '';
            // Low stock (Ticket 4)
            try {
                const lsRes = await fetch(`/api/owner/low-stock?${locParam}`);
                if (lsRes.ok) { const d = await lsRes.json(); setLowStockAlerts(d.alerts || []); }
            } catch { /* ignore */ }
            // Briefing (Ticket 5)
            try {
                const brRes = await fetch('/api/owner/briefing');
                if (brRes.ok) { const d = await brRes.json(); setBriefingData(d.briefing || null); }
            } catch { /* ignore */ }
            // Exceptions (Ticket 6)
            try {
                const exRes = await fetch(`/api/owner/exceptions?${locParam}`);
                if (exRes.ok) { const d = await exRes.json(); setExceptions(d); }
            } catch { /* ignore */ }
            // On-clock (Ticket 8)
            try {
                const ocRes = await fetch(`/api/owner/on-clock?${locParam}`);
                if (ocRes.ok) { const d = await ocRes.json(); setOnClockEmployees(d.employees || []); }
            } catch { /* ignore */ }
            // Sales trend (7-day chart data)
            try {
                const stRes = await fetch('/api/owner/today-stats?' + locParam + '&period=week&trend=true');
                if (stRes.ok) {
                    const d = await stRes.json();
                    if (d.trend) setSalesTrend(d.trend);
                }
            } catch { /* ignore */ }
            // Top products (Sprint 13)
            try {
                const tpRes = await fetch('/api/owner/top-products?' + locParam);
                if (tpRes.ok) { const d = await tpRes.json(); setTopProducts(d.products || []); }
            } catch { /* ignore */ }
            // Pricing alerts (Sprint 13)
            try {
                const paRes = await fetch('/api/owner/pricing-alerts?' + locParam);
                if (paRes.ok) { const d = await paRes.json(); setPricingAlerts(d.alerts || []); }
            } catch { /* ignore */ }
            // Next actions (Sprint 13)
            try {
                const naRes = await fetch('/api/owner/next-actions?' + locParam);
                if (naRes.ok) { const d = await naRes.json(); setNextActions(d.actions || []); }
            } catch { /* ignore */ }
            // Store comparison (Ticket 9)
            try {
                const scRes = await fetch('/api/owner/store-comparison?days=7');
                if (scRes.ok) { const d = await scRes.json(); setStoreComparison(d); }
            } catch { /* ignore */ }
        }
        fetchWidgets();
    }, [currentLocation?.id, period]);

    // Format currency
    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Time ago helper
    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const avgTicket = stats && stats.totalTransactions > 0
        ? stats.totalRevenueToday / stats.totalTransactions
        : 0;

    const changeLabel = stats
        ? (stats.changePercent >= 0 ? `+${stats.changePercent.toFixed(1)}% ${(stats as any).comparisonLabel || 'vs yesterday'}` : `${stats.changePercent.toFixed(1)}% ${(stats as any).comparisonLabel || 'vs yesterday'}`)
        : '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                    <p className="text-[var(--text-secondary)]">{currentLocation?.name}</p>
                </div>
                <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${period === p
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards - Row 1 (Universal) */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard
                    title="Total Sales"
                    value={fmt(stats?.totalRevenueToday ?? 0)}
                    change={changeLabel}
                    changeType={stats && stats.changePercent >= 0 ? 'up' : 'down'}
                    icon={DollarSign}
                />
                <KpiCard
                    title="Transactions"
                    value={String(stats?.totalTransactions ?? 0)}
                    change={`${stats?.walkIns ?? 0} walk-ins`}
                    changeType="neutral"
                    icon={ShoppingCart}
                />
                <KpiCard
                    title="Avg Ticket"
                    value={fmt(avgTicket)}
                    change=""
                    changeType="neutral"
                    icon={TrendingUp}
                />
                <KpiCard
                    title="Unique Customers"
                    value={String(stats?.totalClients ?? 0)}
                    change=""
                    changeType="neutral"
                    icon={Users}
                />
            </div>

            {/* KPI Cards - Row 2 (Conditional by type) */}
            <div className="grid grid-cols-4 gap-4">
                {isRetail && (
                    <>
                        <KpiCard
                            title="Tips Today"
                            value={fmt(stats?.totalTipsToday ?? 0)}
                            change=""
                            changeType="neutral"
                            icon={DollarSign}
                        />
                        <KpiCard
                            title="Service Revenue"
                            value={fmt(stats?.totalServiceRevenue ?? 0)}
                            change=""
                            changeType="neutral"
                            icon={ShoppingCart}
                        />
                    </>
                )}
                {isSalon && (
                    <>
                        <KpiCard
                            title="Tips Today"
                            value={fmt(stats?.totalTipsToday ?? 0)}
                            change=""
                            changeType="neutral"
                            icon={DollarSign}
                        />
                        <KpiCard
                            title="Service Revenue"
                            value={fmt(stats?.totalServiceRevenue ?? 0)}
                            change=""
                            changeType="neutral"
                            icon={Scissors}
                        />
                    </>
                )}
                <KpiCard
                    title="Yesterday Revenue"
                    value={fmt(stats?.yesterdayRevenue ?? 0)}
                    change="Baseline"
                    changeType="neutral"
                    icon={Clock}
                />
                <KpiCard
                    title="Walk-Ins"
                    value={String(stats?.walkIns ?? 0)}
                    change=""
                    changeType="neutral"
                    icon={BarChart3}
                />
            </div>

            {/* Quick Actions — operational, not sidebar duplicates */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-6 gap-4">
                    <QuickAction label="Open POS" icon={ShoppingCart} href="/owner/pos" />
                    <QuickAction label="Cash Drawer" icon={DollarSign} href="/dashboard/owner/cash" />
                    <QuickAction label="Exceptions" icon={AlertCircle} href="/dashboard/owner/exceptions" />
                    <QuickAction label="Briefing" icon={FileText} href="/dashboard/owner/briefing" />
                    <QuickAction label="Tax Report" icon={BarChart3} href="/dashboard/owner/tax-report" />
                    <QuickAction label="Compare Stores" icon={TrendingUp} href="/dashboard/owner/compare" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-2 gap-6">
                {/* Recent Transactions - Live Data */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">Recent Transactions</h3>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {recentTx.length === 0 ? (
                            <div className="p-8 text-center">
                                <ShoppingCart size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                                <p className="text-sm text-[var(--text-secondary)]">No transactions yet today</p>
                            </div>
                        ) : (
                            recentTx.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]">
                                    <div>
                                        <span className="font-mono text-sm text-[var(--text-primary)]">
                                            {tx.client ? `${tx.client.firstName} ${tx.client.lastName?.charAt(0)}.` : `#${tx.id.slice(-4)}`}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] ml-2">{timeAgo(tx.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                            tx.status === 'REFUNDED' ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-700 text-stone-300'
                                            }`}>{tx.status.toLowerCase()}</span>
                                        <span className="font-medium text-[var(--text-primary)]">{fmt(Number(tx.total))}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                            {isSalon ? 'Today at a Glance' : 'Revenue Breakdown'}
                        </h3>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        <div className="flex items-center justify-between p-4">
                            <span className="text-[var(--text-secondary)]">Gross Sales</span>
                            <span className="font-medium text-[var(--text-primary)]">{fmt(stats?.totalRevenueToday ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <span className="text-[var(--text-secondary)]">Tips</span>
                            <span className="font-medium text-emerald-400">{fmt(stats?.totalTipsToday ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <span className="text-[var(--text-secondary)]">Service Revenue</span>
                            <span className="font-medium text-[var(--text-primary)]">{fmt(stats?.totalServiceRevenue ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <span className="text-[var(--text-secondary)]">Yesterday</span>
                            <span className="font-medium text-[var(--text-muted)]">{fmt(stats?.yesterdayRevenue ?? 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ticket 4: Low Stock Alerts */}
            {isRetail && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400" />
                        <h3 className="font-semibold text-[var(--text-primary)]">Low Stock Alerts</h3>
                        {lowStockAlerts.length > 0 && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                                {lowStockAlerts.length} items
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {lowStockAlerts.length === 0 ? (
                            <div className="p-6 text-center text-[var(--text-muted)] text-sm">No low stock alerts</div>
                        ) : (
                            lowStockAlerts.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate text-[var(--text-primary)]">{item.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{item.barcode || 'No barcode'}</div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`text-sm font-bold ${item.outOfStock ? 'text-red-400' : 'text-amber-400'}`}>
                                            {item.stock}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            / {item.reorderPoint}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Ticket 5: Daily Briefing */}
            {briefingData && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        <h3 className="font-semibold text-[var(--text-primary)]">Daily Briefing</h3>
                        {briefingData.counts?.totalActive > 0 && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                {briefingData.counts.totalActive} active issues
                            </span>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        {/* Today's Priority */}
                        {briefingData.todaysPriority && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="text-xs uppercase text-amber-400 font-medium mb-1">Today's Priority</div>
                                <div className="text-sm font-medium text-[var(--text-primary)]">{briefingData.todaysPriority.action}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">{briefingData.todaysPriority.reason}</div>
                            </div>
                        )}
                        {/* Recommendations */}
                        {briefingData.recommendations?.slice(0, 3).map((rec: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                                <Zap size={14} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-[var(--text-primary)] font-medium">{rec.action}</span>
                                    <span className="text-[var(--text-muted)] ml-1">— {rec.reason}</span>
                                </div>
                            </div>
                        ))}
                        {(!briefingData.recommendations || briefingData.recommendations.length === 0) && !briefingData.todaysPriority && (
                            <div className="text-center text-[var(--text-muted)] text-sm py-4">All clear — no active issues</div>
                        )}
                    </div>
                </div>
            )}

            {/* Ticket 6: Exception Alerts */}
            {exceptions && exceptions.counts?.total > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                        <AlertCircle size={18} className="text-red-400" />
                        <h3 className="font-semibold text-[var(--text-primary)]">Exceptions & Alerts</h3>
                        <div className="ml-auto flex items-center gap-2">
                            {exceptions.counts.critical > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                    {exceptions.counts.critical} critical
                                </span>
                            )}
                            {exceptions.counts.warning > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                                    {exceptions.counts.warning} warning
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {exceptions.exceptions?.slice(0, 5).map((exc: any) => (
                            <div key={exc.id} className="flex items-start gap-3 p-3 hover:bg-[var(--surface-hover)]">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    exc.severity === 'CRITICAL' ? 'bg-red-500' :
                                    exc.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{exc.title}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{exc.locationName}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ticket 8: Employees On Clock */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                    <Clock size={18} className="text-emerald-400" />
                    <h3 className="font-semibold text-[var(--text-primary)]">Employees On Clock</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                        {onClockEmployees.length} active
                    </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {onClockEmployees.length === 0 ? (
                        <div className="p-6 text-center text-[var(--text-muted)] text-sm">No employees currently clocked in</div>
                    ) : (
                        onClockEmployees.slice(0, 6).map((emp: any) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Users size={14} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text-primary)]">{emp.name}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{emp.locationName}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-emerald-400">{emp.hoursWorked}h</div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                        since {new Date(emp.clockedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Ticket 9: Store Comparison (multi-location only) */}
            {storeComparison && storeComparison.rankings?.length > 1 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                        <MapPin size={18} className="text-purple-400" />
                        <h3 className="font-semibold text-[var(--text-primary)]">Store Comparison</h3>
                        <span className="ml-auto text-xs text-[var(--text-muted)]">
                            Last {storeComparison.dateRange?.days || 7} days
                        </span>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {storeComparison.rankings.map((store: any, i: number) => (
                            <div key={store.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                        i === 1 ? 'bg-zinc-500/20 text-zinc-400' : 'bg-stone-700/50 text-stone-400'
                                    }`}>{i + 1}</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{store.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-right">
                                        <div className="font-medium text-[var(--text-primary)]">{fmt(store.totalSales)}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{store.totalTransactions} tx</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sales Trend Chart (SVG mini-chart) */}
            {salesTrend.length > 1 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 col-span-full">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">ðŸ“ˆ Sales Trend (Last 7 Days)</h3>
                    <div className="h-32 flex items-end gap-1">
                        {salesTrend.map((d, i) => {
                            const maxRev = Math.max(...salesTrend.map(s => s.revenue), 1);
                            const height = (d.revenue / maxRev) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${fmt(d.revenue)}`}>
                                    <div
                                        className="w-full bg-[var(--primary)]/20 rounded-t hover:bg-[var(--primary)]/40 transition-colors relative group"
                                        style={{ height: `${Math.max(height, 4)}%` }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                            {fmt(d.revenue)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sprint 13: Top Products */}
            {topProducts.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <ShoppingCart size={16} className="text-[var(--primary)]" /> Top Sellers
                        </h3>
                        <a href="/dashboard/owner/reports-hub" className="text-xs text-[var(--primary)] hover:underline">View All</a>
                    </div>
                    <div className="space-y-2">
                        {topProducts.slice(0, 5).map((p: any, i: number) => (
                            <div key={p.id || i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                    <span className="text-[var(--text-primary)] truncate max-w-[180px]">{p.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-medium text-[var(--text-primary)]">{p.totalSold || p.quantity || 0} sold</span>
                                    {p.revenue && <span className="text-xs text-[var(--text-muted)] ml-2">{fmt(p.revenue)}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sprint 13: Pricing Alerts */}
            {pricingAlerts.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} /> Pricing Alerts
                    </h3>
                    <div className="space-y-2">
                        {pricingAlerts.slice(0, 5).map((a: any, i: number) => (
                            <div key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">â€¢</span>
                                <span>{a.message || a.description || `${a.productName}: ${a.type}`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sprint 13: Next Actions */}
            {nextActions.length > 0 && (
                <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5">
                    <h3 className="text-sm font-semibold text-[var(--primary)] flex items-center gap-2 mb-3">
                        <Zap size={16} /> Recommended Actions
                    </h3>
                    <div className="space-y-2">
                        {nextActions.slice(0, 5).map((a: any, i: number) => (
                            <a key={i} href={a.href || '#'} className="flex items-start gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                <span className="text-[var(--primary)] mt-0.5">â†’</span>
                                <span>{a.title || a.message || a.description}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Ticket 10: Management Tools (surfacing hidden owner pages) */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Management Tools</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <QuickAction label="Cash Management" icon={Wallet} href="/dashboard/owner/cash" />
                    <QuickAction label="LP Audit" icon={Shield} href="/dashboard/owner/lp-audit" />
                    <QuickAction label="Gift Cards" icon={Gift} href="/dashboard/owner/gift-cards" />
                    <QuickAction label="Vendors" icon={Truck} href="/dashboard/owner/vendors" />
                    <QuickAction label="Tax Report" icon={Receipt} href="/dashboard/owner/tax-report" />
                    <QuickAction label="Month Close" icon={BookOpen} href="/dashboard/owner/month-close" />
                    <QuickAction label="ID Logs" icon={FileText} href="/dashboard/owner/id-logs" />
                    <QuickAction label="Transfers" icon={Package} href="/dashboard/owner/transfers" />
                    <QuickAction label="Safe Management" icon={Shield} href="/dashboard/owner/safe-management" />
                    <QuickAction label="Sales Rules" icon={BarChart3} href="/dashboard/owner/sales-rules" />
                    <QuickAction label="Reports Hub" icon={TrendingUp} href="/dashboard/owner/reports-hub" />
                    <QuickAction label="Accounting Export" icon={ExternalLink} href="/dashboard/owner/accounting-export" />
                </div>
            </div>

            {/* Ticket 10: AI Insights + Activity Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AIInsightsCard />
                <ActivityFeed />
            </div>
        </div>
    );
}
