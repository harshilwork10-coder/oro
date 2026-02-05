'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface MonthlyData {
    month: string;
    year: number;
    totalSales: number;
    transactionCount: number;
    avgTicket: number;
    cashSales: number;
    cardSales: number;
    tips: number;
    refunds: number;
    taxCollected: number;
    comparison?: {
        salesChange: number;
        transactionChange: number;
    };
    weeklyBreakdown: {
        weekNumber: number;
        weekStart: string;
        sales: number;
        transactions: number;
    }[];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthlyReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MonthlyData | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return { month: now.getMonth(), year: now.getFullYear() };
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMonthlyData();
    }, [currentLocation?.id, selectedMonth]);

    const fetchMonthlyData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const startDate = new Date(selectedMonth.year, selectedMonth.month, 1);
            const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0);

            const res = await fetch(`/api/reports/monthly?franchiseId=${currentLocation.id}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);

            if (!res.ok) throw new Error('Failed to fetch monthly report');

            const result = await res.json();
            setData({
                month: MONTH_NAMES[selectedMonth.month],
                year: selectedMonth.year,
                totalSales: result.summary?.totalSales || 0,
                transactionCount: result.summary?.transactionCount || 0,
                avgTicket: result.summary?.avgTicket || 0,
                cashSales: result.summary?.cashSales || 0,
                cardSales: result.summary?.cardSales || 0,
                tips: result.summary?.tips || 0,
                refunds: result.summary?.refunds || 0,
                taxCollected: result.summary?.taxCollected || 0,
                comparison: result.comparison,
                weeklyBreakdown: result.weeklyBreakdown || []
            });
        } catch (err) {
            console.error('Error fetching monthly data:', err);
            setError('Failed to load monthly report');
        } finally {
            setLoading(false);
        }
    };

    const navigateMonth = (direction: number) => {
        setSelectedMonth(prev => {
            let newMonth = prev.month + direction;
            let newYear = prev.year;
            if (newMonth < 0) { newMonth = 11; newYear--; }
            if (newMonth > 11) { newMonth = 0; newYear++; }
            return { month: newMonth, year: newYear };
        });
    };

    const isCurrentMonth = () => {
        const now = new Date();
        return selectedMonth.month === now.getMonth() && selectedMonth.year === now.getFullYear();
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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
                            Monthly Summary
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                        <button
                            onClick={() => setSelectedMonth({ month: new Date().getMonth(), year: new Date().getFullYear() })}
                            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => navigateMonth(1)}
                            disabled={isCurrentMonth()}
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        <SummaryCard
                            label="Tax Collected"
                            value={formatCurrency(data.taxCollected)}
                        />
                    </div>

                    {/* Payment & Weekly Breakdown */}
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

                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Weekly Breakdown</h3>
                            <div className="space-y-2">
                                {data.weeklyBreakdown.length > 0 ? (
                                    data.weeklyBreakdown.map((week) => (
                                        <div key={week.weekNumber} className="flex justify-between items-center py-1">
                                            <span className="text-[var(--text-secondary)]">Week {week.weekNumber}</span>
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(week.sales)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[var(--text-muted)] text-sm">No data for this month</p>
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
                    <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs last month</span>
                </div>
            )}
        </div>
    );
}
