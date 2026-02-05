'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, TrendingDown, ArrowLeft, Download, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
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
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchWeeklyData();
    }, [currentLocation?.id, weekOffset]);

    const fetchWeeklyData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const today = new Date();
            const currentWeekStart = new Date(today);
            currentWeekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);

            const res = await fetch(`/api/reports/weekly?franchiseId=${currentLocation.id}&startDate=${currentWeekStart.toISOString().split('T')[0]}&endDate=${weekEnd.toISOString().split('T')[0]}`);

            if (!res.ok) throw new Error('Failed to fetch weekly report');

            const result = await res.json();
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

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            window.print();
        } finally {
            setTimeout(() => setExporting(false), 500);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Get max sales for chart scaling
    const maxDailySales = data?.dailyBreakdown?.length
        ? Math.max(...data.dailyBreakdown.map(d => d.sales), 1)
        : 1;

    return (
        <div className="space-y-6" ref={reportRef} id="weekly-report">
            {/* Header with gradient */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-rose-500/20 border border-amber-500/30 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/owner/reports" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-amber-300" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-amber-500/30 rounded-xl">
                                    <Calendar className="w-6 h-6 text-amber-300" />
                                </div>
                                Weekly Summary
                            </h1>
                            {data && (
                                <p className="text-amber-200/80 mt-1 text-sm">
                                    {formatDate(data.weekStart)} - {formatDate(data.weekEnd)}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-black/20 backdrop-blur rounded-xl p-1">
                            <button
                                onClick={() => setWeekOffset(prev => prev - 1)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-amber-200" />
                            </button>
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="px-3 py-1.5 text-sm text-amber-200 hover:text-white font-medium"
                            >
                                This Week
                            </button>
                            <button
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                disabled={weekOffset >= 0}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <ChevronRight className="w-5 h-5 text-amber-200" />
                            </button>
                        </div>
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50"
                        >
                            <FileDown size={18} />
                            {exporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-amber-500/30 rounded-full" />
                        <div className="absolute inset-0 w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-500/10 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards with gradients */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <GlowCard
                            label="Total Sales"
                            value={formatCurrency(data.totalSales)}
                            change={data.comparison?.salesChange}
                            gradient="from-emerald-500 to-teal-600"
                            icon="💰"
                        />
                        <GlowCard
                            label="Transactions"
                            value={data.transactionCount.toLocaleString()}
                            change={data.comparison?.transactionChange}
                            gradient="from-blue-500 to-indigo-600"
                            icon="🧾"
                        />
                        <GlowCard
                            label="Avg Ticket"
                            value={formatCurrency(data.avgTicket)}
                            gradient="from-purple-500 to-violet-600"
                            icon="🎫"
                        />
                        <GlowCard
                            label="Tips"
                            value={formatCurrency(data.tips)}
                            gradient="from-amber-500 to-orange-600"
                            icon="💵"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Sales Chart */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Daily Sales</h3>
                            <div className="flex items-end justify-between gap-2 h-48">
                                {(data.dailyBreakdown.length > 0 ? data.dailyBreakdown :
                                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ dayName: d, sales: 0, date: '', transactions: 0 }))
                                ).map((day, idx) => {
                                    const height = maxDailySales > 0 ? (day.sales / maxDailySales) * 100 : 0;
                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1 group">
                                            <div className="relative w-full flex justify-center mb-2">
                                                <div
                                                    className="w-full max-w-[40px] bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all duration-500 group-hover:from-amber-400 group-hover:to-amber-200 relative"
                                                    style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        {formatCurrency(day.sales)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-white/50 font-medium">{day.dayName?.substring(0, 3)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Payment Methods</h3>
                            <div className="space-y-4">
                                <PaymentBar
                                    label="Cash"
                                    amount={data.cashSales}
                                    total={data.totalSales}
                                    color="from-emerald-500 to-emerald-400"
                                />
                                <PaymentBar
                                    label="Card"
                                    amount={data.cardSales}
                                    total={data.totalSales}
                                    color="from-blue-500 to-blue-400"
                                />
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

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #weekly-report, #weekly-report * { visibility: visible; }
                    #weekly-report { 
                        position: absolute; 
                        left: 0; 
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    .bg-gradient-to-r, .bg-gradient-to-br {
                        background: #f3f4f6 !important;
                    }
                }
            `}</style>
        </div>
    );
}

function GlowCard({ label, value, change, gradient, icon }: {
    label: string;
    value: string;
    change?: number;
    gradient: string;
    icon: string;
}) {
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
                        <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs last week</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentBar({ label, amount, total, color }: {
    label: string;
    amount: number;
    total: number;
    color: string;
}) {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    return (
        <div>
            <div className="flex justify-between mb-2">
                <span className="text-white font-medium">{label}</span>
                <span className="text-white/80">{formatCurrency(amount)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                    className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-white/40 mt-1">{percentage.toFixed(1)}% of total</p>
        </div>
    );
}
