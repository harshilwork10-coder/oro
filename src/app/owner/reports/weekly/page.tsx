'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface WeeklyData {
    weekStart: string;
    weekEnd: string;
    totalSales: number;
    transactionCount: number;
    avgTicket: number;
    cashSales: number;
    cardSales: number;
    tips: number;
    refunds: number;
    comparison?: {
        salesChange: number;
        transactionChange: number;
    };
    dailyBreakdown: {
        date: string;
        dayName: string;
        sales: number;
        transactions: number;
    }[];
}

export default function WeeklyReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<WeeklyData | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWeeklyData();
    }, [currentLocation?.id, weekOffset]);

    const fetchWeeklyData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            // Calculate week dates based on offset
            const today = new Date();
            const currentWeekStart = new Date(today);
            currentWeekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);

            const res = await fetch(`/api/reports/weekly?franchiseId=${currentLocation.id}&startDate=${currentWeekStart.toISOString().split('T')[0]}&endDate=${weekEnd.toISOString().split('T')[0]}`);

            if (!res.ok) throw new Error('Failed to fetch weekly report');

            const result = await res.json();
            // Transform API response to our format
            setData({
                weekStart: currentWeekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                totalSales: result.summary?.totalSales || 0,
                transactionCount: result.summary?.transactionCount || 0,
                avgTicket: result.summary?.avgTicket || 0,
                cashSales: result.summary?.cashSales || 0,
                cardSales: result.summary?.cardSales || 0,
                tips: result.summary?.tips || 0,
                refunds: result.summary?.refunds || 0,
                comparison: result.comparison,
                dailyBreakdown: result.dailyBreakdown || []
            });
        } catch (err) {
            console.error('Error fetching weekly data:', err);
            setError('Failed to load weekly report');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/owner/reports" className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <Calendar className="w-7 h-7 text-amber-400" />
                            Weekly Summary
                        </h1>
                        {data && (
                            <p className="text-[var(--text-secondary)] mt-1">
                                {formatDate(data.weekStart)} - {formatDate(data.weekEnd)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                        <button
                            onClick={() => setWeekOffset(prev => prev - 1)}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                        <button
                            onClick={() => setWeekOffset(0)}
                            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            disabled={weekOffset >= 0}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded transition-colors disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors">
                        <Download size={18} />
                        Export PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard
                            label="Total Sales"
                            value={formatCurrency(data.totalSales)}
                            change={data.comparison?.salesChange}
                        />
                        <SummaryCard
                            label="Transactions"
                            value={data.transactionCount.toLocaleString()}
                            change={data.comparison?.transactionChange}
                        />
                        <SummaryCard
                            label="Avg Ticket"
                            value={formatCurrency(data.avgTicket)}
                        />
                        <SummaryCard
                            label="Tips"
                            value={formatCurrency(data.tips)}
                        />
                    </div>

                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Payment Methods</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Cash</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(data.cashSales)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Card</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(data.cardSales)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-[var(--border)] pt-3">
                                    <span className="text-[var(--text-secondary)]">Refunds</span>
                                    <span className="font-semibold text-red-400">-{formatCurrency(data.refunds)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Daily Breakdown */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Daily Breakdown</h3>
                            <div className="space-y-2">
                                {data.dailyBreakdown.length > 0 ? (
                                    data.dailyBreakdown.map((day) => (
                                        <div key={day.date} className="flex justify-between items-center py-1">
                                            <span className="text-[var(--text-secondary)]">{day.dayName}</span>
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(day.sales)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[var(--text-muted)] text-sm">No data for this week</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function SummaryCard({ label, value, change }: { label: string; value: string; change?: number }) {
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
            {change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs last week</span>
                </div>
            )}
        </div>
    );
}
