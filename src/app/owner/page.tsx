'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from './layout';
import {
    DollarSign, TrendingUp, ShoppingCart, Users, Clock,
    AlertTriangle, Loader2, MapPin, BarChart3,
} from 'lucide-react';

// Shared command-center components
import DashboardShell from '@/components/dashboard/command-center/DashboardShell';
import CommandHeader from '@/components/dashboard/command-center/CommandHeader';
import KpiStrip from '@/components/dashboard/command-center/KpiStrip';
import AlertRail from '@/components/dashboard/command-center/AlertRail';
import type { ExceptionItem } from '@/components/dashboard/command-center/AlertRail';
import OwnerActionCenter from '@/components/dashboard/command-center/OwnerActionCenter';
import WorkspaceTabs from '@/components/dashboard/command-center/WorkspaceTabs';
import DataTruthLabel from '@/components/dashboard/command-center/DataTruthLabel';
import type { DataTruthMeta } from '@/components/dashboard/command-center/DataTruthLabel';
import OwnerLocationGrid from '@/components/dashboard/command-center/OwnerLocationGrid';
import type { LocationRow } from '@/components/dashboard/command-center/OwnerLocationGrid';
import LocationDetailDrawer from '@/components/dashboard/command-center/LocationDetailDrawer';

// ── Types ───────────────────────────────────────────────────────────────────

interface MultiStoreData {
    locations: any[];
    summary: {
        totalLocations: number;
        todaySales: number;
        todayTransactions: number;
        yesterdaySales: number;
        mtdSales: number;
        lowStockTotal: number;
        topLocation: string | null;
    } | null;
    _meta?: DataTruthMeta;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCompact(n: number): string {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
}

/**
 * Deduplicate exceptions by location+type.
 * Groups repeated items and appends count suffix.
 */
function dedupeExceptions(raw: any[]): ExceptionItem[] {
    const keyMap = new Map<string, any>();

    for (const exc of raw) {
        const key = `${exc.locationId || ''}::${exc.type || exc.exceptionType || ''}`;
        if (keyMap.has(key)) {
            const existing = keyMap.get(key);
            existing._count = (existing._count || 1) + 1;
            // Keep highest severity
            const sevOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
            const eSev = (sevOrder as any)[existing.severity] || 0;
            const nSev = (sevOrder as any)[exc.severity] || 0;
            if (nSev > eSev) existing.severity = exc.severity;
        } else {
            keyMap.set(key, { ...exc, _count: 1 });
        }
    }

    return Array.from(keyMap.values()).map((exc) => ({
        id: exc.id,
        type: exc.type || exc.exceptionType || '',
        severity: exc.severity as 'CRITICAL' | 'WARNING' | 'INFO',
        title: exc._count > 1 ? `${exc.title} (×${exc._count})` : exc.title,
        description: exc.description || '',
        locationName: exc.locationName || '',
        createdAt: typeof exc.createdAt === 'string' ? exc.createdAt : new Date(exc.createdAt).toISOString(),
    }));
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
    const { currentLocation } = useLocation();

    // Data
    const [multiStore, setMultiStore] = useState<MultiStoreData | null>(null);
    const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
    const [rawExceptions, setRawExceptions] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Drawer
    const [drawerLocationId, setDrawerLocationId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // ── Data fetching ───────────────────────────────────────────────
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Multi-store dashboard data
            const msRes = await fetch('/api/dashboard/multi-store');
            if (msRes.ok) {
                const data = await msRes.json();
                setMultiStore(data);
            }

            // Exceptions (for Alert Rail)
            const exRes = await fetch('/api/owner/exceptions');
            if (exRes.ok) {
                const data = await exRes.json();
                setRawExceptions(data);
                setExceptions(dedupeExceptions(data.exceptions || []));
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        }

        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Loading state ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-accent,var(--primary))]" />
                    <p className="text-sm text-stone-500 font-medium">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    const summary = multiStore?.summary;
    const meta = multiStore?._meta || null;

    // ── Compute KPIs ────────────────────────────────────────────────
    const todaySales = summary?.todaySales ?? 0;
    const yesterdaySales = summary?.yesterdaySales ?? 0;
    const todayTx = summary?.todayTransactions ?? 0;
    const avgTicket = todayTx > 0 ? todaySales / todayTx : 0;
    const salesDelta = yesterdaySales > 0
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
        : 0;

    // ── Location rows for grid ──────────────────────────────────────
    const locationRows: LocationRow[] = (multiStore?.locations || []).map((l: any) => ({
        id: l.location.id,
        name: l.location.name,
        address: l.location.address,
        status: l.status || 'active',
        todaySales: l.today?.sales || 0,
        yesterdaySales: l.yesterday?.sales || 0,
        transactions: l.today?.transactions || 0,
        avgTicket: l.today?.avgTicket || 0,
        mtdSales: l.mtd?.sales || 0,
        activeStaff: l.staff?.total || 0,
        onClock: l.staff?.onClock || 0,
        cash: l.today?.cash || 0,
        card: l.today?.card || 0,
        lowStock: l.inventory?.lowStock || 0,
    }));

    // ── Drawer data ─────────────────────────────────────────────────
    const drawerLocationData = drawerLocationId
        ? (multiStore?.locations || []).find((l: any) => l.location.id === drawerLocationId)
        : null;

    // ── Pending counts for Action Center ────────────────────────────
    const pendingExceptions = rawExceptions?.counts?.total || 0;

    // ═══════════════════════════════════════════════════════════════════
    // RENDER via DashboardShell
    // ═══════════════════════════════════════════════════════════════════

    return (
        <>
            <DashboardShell
                // ── Zone A: Command Header ──────────────────────────
                header={
                    <CommandHeader
                        title="Owner Command Center"
                        subtitle={
                            summary
                                ? `${summary.totalLocations} location${summary.totalLocations !== 1 ? 's' : ''} · ${currentLocation?.name || 'All Stores'}`
                                : 'Multi-Store Overview'
                        }
                        icon={MapPin}
                        roleBadge="Owner"
                        roleBadgeColor="bg-violet-500/15 text-violet-400 border-violet-500/25"
                        onRefresh={() => fetchData(true)}
                        refreshing={refreshing}
                    >
                        <DataTruthLabel meta={meta as DataTruthMeta | null} />
                    </CommandHeader>
                }

                // ── Zone B: KPI Strip ───────────────────────────────
                kpiStrip={
                    <KpiStrip
                        columns={5}
                        kpis={[
                            {
                                title: 'Total Sales',
                                value: fmt(todaySales),
                                icon: DollarSign,
                                variant: 'accent',
                                trend: { value: salesDelta, label: 'vs yesterday' },
                            },
                            {
                                title: 'Transactions',
                                value: String(todayTx),
                                icon: ShoppingCart,
                                subtitle: `Avg ticket ${fmt(avgTicket)}`,
                            },
                            {
                                title: 'Yesterday',
                                value: fmt(yesterdaySales),
                                icon: Clock,
                                subtitle: 'Full business day',
                            },
                            {
                                title: 'MTD Revenue',
                                value: fmtCompact(summary?.mtdSales ?? 0),
                                icon: TrendingUp,
                                variant: 'success',
                            },
                            {
                                title: 'Alerts',
                                value: String(pendingExceptions),
                                icon: AlertTriangle,
                                variant: pendingExceptions > 0 ? 'danger' : 'default',
                                pulse: pendingExceptions > 0,
                                subtitle: pendingExceptions > 0 ? 'Needs attention' : 'All clear',
                            },
                        ]}
                    />
                }

                // ── Zone C: Alert Rail ──────────────────────────────
                alertRail={
                    <AlertRail
                        exceptions={exceptions}
                        maxVisible={6}
                        onViewAll={() => {
                            window.location.href = '/owner/store-health';
                        }}
                        emptyTitle="No Exceptions"
                        emptySubtitle="All stores operating normally"
                    />
                }

                // ── Zone D: Action Center (NOT passive shortcuts) ───
                quickActions={
                    <OwnerActionCenter
                        pendingExceptions={pendingExceptions}
                        pendingTransfers={0}
                        cashVarianceAlert={false}
                    />
                }

                // ── Zone E: Primary Workspace ───────────────────────
                workspace={
                    <WorkspaceTabs
                        tabs={[
                            {
                                id: 'locations',
                                label: 'Store Performance',
                                icon: BarChart3,
                                badge: locationRows.length,
                                content: (
                                    <OwnerLocationGrid
                                        locations={locationRows}
                                        onSelectLocation={(id) => {
                                            setDrawerLocationId(id);
                                            setDrawerOpen(true);
                                        }}
                                    />
                                ),
                            },
                            {
                                id: 'exceptions',
                                label: 'Exceptions',
                                icon: AlertTriangle,
                                badge: pendingExceptions,
                                content: (
                                    <div className="space-y-3">
                                        {exceptions.length === 0 ? (
                                            <div className="text-center py-12">
                                                <AlertTriangle className="h-10 w-10 mx-auto text-stone-700 mb-3" />
                                                <p className="text-stone-400 font-medium">No Active Exceptions</p>
                                                <p className="text-xs text-stone-600 mt-1">All stores are healthy</p>
                                            </div>
                                        ) : (
                                            exceptions.map((exc) => {
                                                const sevColors = {
                                                    CRITICAL: 'border-red-500/20 bg-red-500/[0.04]',
                                                    WARNING: 'border-amber-500/20 bg-amber-500/[0.04]',
                                                    INFO: 'border-blue-500/20 bg-blue-500/[0.04]',
                                                };
                                                const dotColors = {
                                                    CRITICAL: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
                                                    WARNING: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
                                                    INFO: 'bg-blue-500',
                                                };
                                                return (
                                                    <div
                                                        key={exc.id}
                                                        className={`flex items-start gap-3 p-4 rounded-xl border ${sevColors[exc.severity]}`}
                                                    >
                                                        <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColors[exc.severity]}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-white text-sm">{exc.title}</p>
                                                            <p className="text-xs text-stone-400 mt-0.5">{exc.description}</p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className="text-[11px] font-medium text-stone-500 bg-stone-800/80 px-2 py-0.5 rounded">
                                                                    {exc.locationName}
                                                                </span>
                                                                <span className="text-[11px] text-stone-600">
                                                                    {new Date(exc.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        defaultTab="locations"
                    />
                }

                // ── Zone F: Trend Footer ────────────────────────────
                trendFooter={
                    summary ? (
                        <div className="flex items-center justify-between px-5 py-3 bg-stone-900/30 backdrop-blur-md border border-white/[0.04] rounded-xl">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{summary.totalLocations} locations</span>
                                </div>
                                {summary.topLocation && (
                                    <div className="flex items-center gap-2 text-xs text-stone-500">
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>Top: <strong className="text-stone-300">{summary.topLocation}</strong></span>
                                    </div>
                                )}
                                {(summary.lowStockTotal ?? 0) > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-amber-500">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span>{summary.lowStockTotal} low stock items</span>
                                    </div>
                                )}
                            </div>
                            <DataTruthLabel meta={meta as DataTruthMeta | null} compact />
                        </div>
                    ) : undefined
                }
            />

            {/* Location Detail Drawer */}
            <LocationDetailDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setDrawerLocationId(null);
                }}
                locationId={drawerLocationId}
                locationData={drawerLocationData}
            />
        </>
    );
}
