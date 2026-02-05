'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface QuarterlyData {
    quarter: number;
    year: number;
    quarterLabel: string;
    summary: {
        totalSales: number;
        transactionCount: number;
        avgTicket: number;
        cashSales: number;
        cardSales: number;
        tips: number;
        taxCollected: number;
        refunds: number;
    };
    comparison: {
        salesChange: number;
        transactionChange: number;
    };
    monthlyBreakdown: {
        month: string;
        sales: number;
        transactions: number;
    }[];
}

export default function QuarterlyReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<QuarterlyData | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const now = new Date();
        return { quarter: Math.ceil((now.getMonth() + 1) / 3), year: now.getFullYear() };
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchQuarterlyData();
    }, [currentLocation?.id, selectedQuarter]);

    const fetchQuarterlyData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/reports/quarterly?franchiseId=${currentLocation.id}&quarter=${selectedQuarter.quarter}&year=${selectedQuarter.year}`);

            if (!res.ok) throw new Error('Failed to fetch quarterly report');

            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching quarterly data:', err);
            setError('Failed to load quarterly report');
        } finally {
            setLoading(false);
        }
    };

    const navigateQuarter = (direction: number) => {
        setSelectedQuarter(prev => {
            let newQuarter = prev.quarter + direction;
            let newYear = prev.year;
            if (newQuarter < 1) { newQuarter = 4; newYear--; }
            if (newQuarter > 4) { newQuarter = 1; newYear++; }
            return { quarter: newQuarter, year: newYear };
        });
    };

    const isCurrentQuarter = () => {
        const now = new Date();
        const currentQ = Math.ceil((now.getMonth() + 1) / 3);
        return selectedQuarter.quarter === currentQ && selectedQuarter.year === now.getFullYear();
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
                            <BarChart3 className="w-7 h-7 text-amber-400" />
                            Quarterly Summary
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Q{selectedQuarter.quarter} {selectedQuarter.year}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                        <button
                            onClick={() => navigateQuarter(-1)}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                        <button
                            onClick={() => {
                                const now = new Date();
                                setSelectedQuarter({ quarter: Math.ceil((now.getMonth() + 1) / 3), year: now.getFullYear() });
                            }}
                            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            Current Quarter
                        </button>
                        <button
                            onClick={() => navigateQuarter(1)}
                            disabled={isCurrentQuarter()}
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
                            value={formatCurrency(data.summary.totalSales)}
                            change={data.comparison.salesChange}
                            changeLabel="vs last quarter"
                        />
                        <SummaryCard
                            label="Transactions"
                            value={data.summary.transactionCount.toLocaleString()}
                            change={data.comparison.transactionChange}
                            changeLabel="vs last quarter"
                        />
                        <SummaryCard
                            label="Avg Ticket"
                            value={formatCurrency(data.summary.avgTicket)}
                        />
                        <SummaryCard
                            label="Tips"
                            value={formatCurrency(data.summary.tips)}
                        />
                        <SummaryCard
                            label="Tax Collected"
                            value={formatCurrency(data.summary.taxCollected)}
                        />
                    </div>

                    {/* Payment & Monthly Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Payment Methods</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Cash</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(data.summary.cashSales)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-secondary)]">Card</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(data.summary.cardSales)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-[var(--border)] pt-3">
                                    <span className="text-[var(--text-secondary)]">Refunds</span>
                                    <span className="font-semibold text-red-400">-{formatCurrency(data.summary.refunds)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Monthly Breakdown</h3>
                            <div className="space-y-2">
                                {data.monthlyBreakdown.map((month) => (
                                    <div key={month.month} className="flex justify-between items-center py-1">
                                        <span className="text-[var(--text-secondary)]">{month.month}</span>
                                        <div className="text-right">
                                            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(month.sales)}</span>
                                            <span className="text-xs text-[var(--text-muted)] ml-2">({month.transactions} txns)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function SummaryCard({ label, value, change, changeLabel }: { label: string; value: string; change?: number; changeLabel?: string }) {
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
            {change !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}</span>
                </div>
            )}
        </div>
    );
}
