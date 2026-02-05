'use client';

import { useState, useEffect } from 'react';
import { Gift, ArrowLeft, Download, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface GiftCardData {
    summary: {
        totalSold: number;
        totalRedeemed: number;
        outstandingBalance: number;
        cardsSold: number;
        cardsRedeemed: number;
    };
    recentActivity: {
        id: string;
        type: 'sold' | 'redeemed';
        amount: number;
        cardNumber: string;
        date: string;
        customerName?: string;
    }[];
}

export default function GiftCardsReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<GiftCardData | null>(null);
    const [dateRange, setDateRange] = useState('30d');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchGiftCardData();
    }, [currentLocation?.id, dateRange]);

    const fetchGiftCardData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/reports/gift-cards?franchiseId=${currentLocation.id}&range=${dateRange}`);

            if (!res.ok) throw new Error('Failed to fetch gift card report');

            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching gift card data:', err);
            setError('Failed to load gift card report');
        } finally {
            setLoading(false);
        }
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
                            <Gift className="w-7 h-7 text-amber-400" />
                            Gift Card Report
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Sold, redeemed, and outstanding balances
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)]"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors">
                        <Download size={18} />
                        Export
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
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Total Sold</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(data.summary.totalSold)}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{data.summary.cardsSold} cards</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Total Redeemed</p>
                            <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(data.summary.totalRedeemed)}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{data.summary.cardsRedeemed} redemptions</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:col-span-3">
                            <p className="text-sm text-[var(--text-muted)]">Outstanding Balance</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(data.summary.outstandingBalance)}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Liability on books</p>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border)]">
                            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Recent Activity</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-[var(--surface-hover)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Card #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Customer</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentActivity.length > 0 ? (
                                    data.recentActivity.map((activity) => (
                                        <tr key={activity.id} className="border-t border-[var(--border)]">
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{activity.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`flex items-center gap-1 text-sm ${activity.type === 'sold' ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}>
                                                    {activity.type === 'sold' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                    {activity.type === 'sold' ? 'Sold' : 'Redeemed'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono">{activity.cardNumber}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{activity.customerName || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)] text-right font-semibold">
                                                {formatCurrency(activity.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                                            No gift card activity for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    );
}
