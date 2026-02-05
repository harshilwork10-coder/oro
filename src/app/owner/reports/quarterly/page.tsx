'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, ArrowLeft, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
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
    const [exporting, setExporting] = useState(false);

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

    const handleExportPDF = () => {
        setExporting(true);
        window.print();
        setTimeout(() => setExporting(false), 500);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const maxMonthlySales = data?.monthlyBreakdown?.length
        ? Math.max(...data.monthlyBreakdown.map(m => m.sales), 1)
        : 1;

    return (
        <div className="space-y-6" id="quarterly-report">
            {/* Header with gradient */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-emerald-500/20 border border-cyan-500/30 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/owner/reports" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-cyan-300" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/30 rounded-xl">
                                    <BarChart3 className="w-6 h-6 text-cyan-300" />
                                </div>
                                Quarterly Summary
                            </h1>
                            <p className="text-cyan-200/80 mt-1 text-sm">
                                Q{selectedQuarter.quarter} {selectedQuarter.year}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-black/20 backdrop-blur rounded-xl p-1">
                            <button onClick={() => navigateQuarter(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <ChevronLeft className="w-5 h-5 text-cyan-200" />
                            </button>
                            <button onClick={() => { const now = new Date(); setSelectedQuarter({ quarter: Math.ceil((now.getMonth() + 1) / 3), year: now.getFullYear() }); }} className="px-3 py-1.5 text-sm text-cyan-200 hover:text-white font-medium">
                                Current
                            </button>
                            <button onClick={() => navigateQuarter(1)} disabled={isCurrentQuarter()} className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50">
                                <ChevronRight className="w-5 h-5 text-cyan-200" />
                            </button>
                        </div>
                        <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/25">
                            <FileDown size={18} />
                            {exporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-cyan-500/30 rounded-full" />
                        <div className="absolute inset-0 w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
                        <GlowCard label="Total Sales" value={formatCurrency(data.summary.totalSales)} change={data.comparison.salesChange} gradient="from-emerald-500 to-teal-600" icon="💰" vsLabel="vs last Q" />
                        <GlowCard label="Transactions" value={data.summary.transactionCount.toLocaleString()} change={data.comparison.transactionChange} gradient="from-blue-500 to-indigo-600" icon="🧾" vsLabel="vs last Q" />
                        <GlowCard label="Avg Ticket" value={formatCurrency(data.summary.avgTicket)} gradient="from-purple-500 to-violet-600" icon="🎫" />
                        <GlowCard label="Tips" value={formatCurrency(data.summary.tips)} gradient="from-amber-500 to-orange-600" icon="💵" />
                        <GlowCard label="Tax Collected" value={formatCurrency(data.summary.taxCollected)} gradient="from-rose-500 to-pink-600" icon="📋" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Monthly Breakdown Chart */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Monthly Performance</h3>
                            <div className="flex items-end justify-around gap-6 h-48">
                                {data.monthlyBreakdown.map((month, idx) => {
                                    const height = maxMonthlySales > 0 ? (month.sales / maxMonthlySales) * 100 : 0;
                                    return (
                                        <div key={idx} className="flex flex-col items-center flex-1 group">
                                            <div className="relative w-full flex justify-center mb-2">
                                                <div className="w-full max-w-[60px] bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-lg transition-all duration-500 group-hover:from-cyan-400 relative"
                                                    style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}>
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        {formatCurrency(month.sales)}<br />
                                                        <span className="text-white/60">{month.transactions} txns</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-sm text-white/50 font-medium">{month.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#0f1423] border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">Payment Methods</h3>
                            <div className="space-y-4">
                                <PaymentBar label="Cash" amount={data.summary.cashSales} total={data.summary.totalSales} color="from-emerald-500 to-emerald-400" />
                                <PaymentBar label="Card" amount={data.summary.cardSales} total={data.summary.totalSales} color="from-blue-500 to-blue-400" />
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Refunds</span>
                                        <span className="font-semibold text-red-400">-{formatCurrency(data.summary.refunds)}</span>
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
                    #quarterly-report, #quarterly-report * { visibility: visible; }
                    #quarterly-report { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                }
            `}</style>
        </div>
    );
}

function GlowCard({ label, value, change, gradient, icon, vsLabel }: { label: string; value: string; change?: number; gradient: string; icon: string; vsLabel?: string; }) {
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
                        <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}% {vsLabel}</span>
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
