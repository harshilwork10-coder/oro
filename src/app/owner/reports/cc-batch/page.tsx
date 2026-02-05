'use client';

import { useState, useEffect } from 'react';
import { CreditCard, ArrowLeft, Download, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface BatchTransaction {
    id: string;
    time: string;
    cardType: string;
    lastFour: string;
    amount: number;
    authCode: string;
    status: string;
}

interface BatchData {
    batchId: string;
    batchDate: string;
    totalAmount: number;
    transactionCount: number;
    transactions: BatchTransaction[];
}

export default function CCBatchReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<BatchData | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBatchData();
    }, [currentLocation?.id, selectedDate]);

    const fetchBatchData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/reports/cc-batch?franchiseId=${currentLocation.id}&date=${selectedDate}`);

            if (!res.ok) throw new Error('Failed to fetch CC batch report');

            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching CC batch:', err);
            setError('Failed to load CC batch report');
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
                            <CreditCard className="w-7 h-7 text-amber-400" />
                            Credit Card Batch Report
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Transaction details for dispute resolution
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[var(--surface)] rounded-lg p-2">
                        <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-[var(--text-primary)] border-none outline-none"
                        />
                    </div>
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
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Batch ID</p>
                            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{data.batchId || 'N/A'}</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Total Amount</p>
                            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(data.totalAmount)}</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Transactions</p>
                            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{data.transactionCount}</p>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--surface-hover)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Card</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Last 4</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Auth Code</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.transactions.length > 0 ? (
                                    data.transactions.map((tx) => (
                                        <tr key={tx.id} className="border-t border-[var(--border)]">
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{tx.time}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{tx.cardType}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono">****{tx.lastFour}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono">{tx.authCode}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-primary)] text-right">{formatCurrency(tx.amount)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full ${tx.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                                            No credit card transactions for this date
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
