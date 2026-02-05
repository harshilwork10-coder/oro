'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, ArrowLeft, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
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
    const [exporting, setExporting] = useState(false);

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

    const handleExportPDF = () => {
        setExporting(true);
        window.print();
        setTimeout(() => setExporting(false), 500);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const maxWeeklySales = data?.weeklyBreakdown?.length
        ? Math.max(...data.weeklyBreakdown.map(w => w.sales), 1)
        : 1;

    return (
        <div className="space-y-6" id="monthly-report">
            {/* Header with gradient */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 border border-violet-500/30 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-400/10 via-transparent to-transparent" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/owner/reports" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-violet-300" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-violet-500/30 rounded-xl">
                                    <Calendar className="w-6 h-6 text-violet-300" />
                                </div>
                                Monthly Summary
                            </h1>
                            <p className="text-violet-200/80 mt-1 text-sm">
                                {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-black/20 backdrop-blur rounded-xl p-1">
                            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <ChevronLeft className="w-5 h-5 text-violet-200" />
                            </button>
                            <button onClick={() => setSelectedMonth({ month: new Date().getMonth(), year: new Date().getFullYear() })} className="px-3 py-1.5 text-sm text-violet-200 hover:text-white font-medium">
                                This Month
                            </button>
                            <button onClick={() => navigateMonth(1)} disabled={isCurrentMonth()} className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50">
                                <ChevronRight className="w-5 h-5 text-violet-200" />
                            </button>
                        </div>
                        <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25">
                            <FileDown size={18} />
                            {exporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-violet-500/30 rounded-full" />
                        <div className="absolute inset-0 w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <GlowCard label="Total Sales" value={formatCurrency(data.totalSales)} change={data.comparison?.salesChange} gradient="from-emerald-500 to-teal-600" icon="💰" />
                        <GlowCard label="Transactions" value={data.transactionCount.toLocaleString()} change={data.comparison?.transactionChange} gradient="from-blue-500 to-indigo-600" icon="🧾" />
                        <GlowCard label="Avg Ticket" value={formatCurrency(data.avgTicket)} gradient="from-purple-500 to-violet-600" icon="🎫" />
                        <GlowCard label="Tips" value={formatCurrency(data.tips)} gradient="from-amber-500 to-orange-600" icon="💵" />
                        <GlowCard label="Tax Collected" value={formatCurrency(data.taxCollected)} gradient="from-rose-500 to-pink-600" icon="📋" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Breakdown Chart */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Weekly Performance</h3>
                            <div className="flex items-end justify-around gap-4 h-48">
                                {(data.weeklyBreakdown.length > 0 ? data.weeklyBreakdown :
                                    [1, 2, 3, 4, 5].map(w => ({ weekNumber: w, sales: 0, weekStart: '', transactions: 0 }))
                                ).map((week, idx) => {
                                    const height = maxWeeklySales > 0 ? (week.sales / maxWeeklySales) * 100 : 0;
                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1 group">
                                            <div className="relative w-full flex justify-center mb-2">
                                                <div className="w-full max-w-[50px] bg-gradient-to-t from-violet-500 to-violet-300 rounded-t-lg transition-all duration-500 group-hover:from-violet-400 relative"
                                                    style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}>
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        {formatCurrency(week.sales)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-white/50 font-medium">W{week.weekNumber}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Payment Methods</h3>
                            <div className="space-y-4">
                                <PaymentBar label="Cash" amount={data.cashSales} total={data.totalSales} color="from-emerald-500 to-emerald-400" />
                                <PaymentBar label="Card" amount={data.cardSales} total={data.totalSales} color="from-blue-500 to-blue-400" />
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Refunds</span>
                                        <span className="font-semibold text-red-400">-{formatCurrency(data.refunds)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #monthly-report, #monthly-report * { visibility: visible; }
                    #monthly-report { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                }
            `}</style>
        </div>
    );
}

function GlowCard({ label, value, change, gradient, icon }: { label: string; value: string; change?: number; gradient: string; icon: string; }) {
    return (
        <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
            <div className="relative bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-5 shadow-xl">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-sm text-white/60 font-medium">{label}</p>
                    <span className="text-2xl">{icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string; }) {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    return (
        <div>
            <div className="flex justify-between mb-2">
                <span className="text-white font-medium">{label}</span>
                <span className="text-white/80">{formatCurrency(amount)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
