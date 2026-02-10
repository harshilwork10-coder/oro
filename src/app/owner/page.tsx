'use client';

import { useState, useEffect } from 'react';
import { useLocation } from './layout';
import {
    DollarSign, TrendingUp, ShoppingCart, Users, Calendar, Clock,
    Package, Scissors, BarChart3, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';

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

    const isRetail = currentLocation?.type === 'retail' || currentLocation?.type === 'both';
    const isSalon = currentLocation?.type === 'salon' || currentLocation?.type === 'both';

    // Fetch live stats from the API
    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                // Fetch today's stats
                const statsRes = await fetch('/api/owner/today-stats');
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                // Fetch recent transactions
                const txRes = await fetch('/api/transactions?limit=5&status=COMPLETED');
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
    }, [currentLocation?.id]);

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
        ? (stats.changePercent >= 0 ? `+${stats.changePercent.toFixed(1)}% vs yesterday` : `${stats.changePercent.toFixed(1)}% vs yesterday`)
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

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-6 gap-4">
                    <QuickAction label="Open POS" icon={ShoppingCart} href="/owner/pos" />
                    {isSalon && <QuickAction label="New Appointment" icon={Calendar} href="/owner/appointments/new" />}
                    {isRetail && <QuickAction label="Inventory" icon={Package} href="/owner/inventory" />}
                    <QuickAction label="Time Clock" icon={Clock} href="/owner/time-clock" />
                    <QuickAction label="Reports" icon={BarChart3} href="/owner/reports" />
                    <QuickAction label="Employees" icon={Users} href="/owner/employees" />
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
        </div>
    );
}
