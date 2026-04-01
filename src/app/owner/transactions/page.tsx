'use client';

import { useState, useEffect } from 'react';
import { Search, Download, CreditCard, DollarSign, RefreshCw, Calendar, AlertCircle } from 'lucide-react';

type FilterStatus = 'all' | 'COMPLETED' | 'REFUNDED' | 'VOIDED';

interface Transaction {
    id: string;
    total: number | string;
    paymentMethod?: string;
    status: string;
    createdAt: string;
    client?: { firstName?: string; lastName?: string } | null;
}

function PaymentBadge({ method }: { method?: string }) {
    const m = method?.toUpperCase() || 'CARD';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m === 'CASH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {m === 'CASH' ? <DollarSign size={12} /> : <CreditCard size={12} />}
            {m === 'CASH' ? 'Cash' : 'Card'}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status?.toUpperCase();
    const styles: Record<string, string> = {
        COMPLETED: 'bg-emerald-500/20 text-emerald-400',
        REFUNDED: 'bg-amber-500/20 text-amber-400',
        VOIDED: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[s] || 'bg-stone-500/20 text-stone-400'}`}>
            {status.toLowerCase()}
        </span>
    );
}

export default function TransactionsPage() {
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (filter !== 'all') params.set('status', filter);
            const res = await fetch(`/api/transactions?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setTransactions(data.transactions || []);
        } catch (err) {
            setError('Could not load transactions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransactions(); }, [filter]);

    const filtered = transactions.filter(tx => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = `${tx.client?.firstName || ''} ${tx.client?.lastName || ''}`.toLowerCase();
        return tx.id.toLowerCase().includes(q) || name.includes(q);
    });

    const tabs: { id: FilterStatus; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'COMPLETED', label: 'Completed' },
        { id: 'REFUNDED', label: 'Refunded' },
        { id: 'VOIDED', label: 'Voided' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transactions</h1>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${filter === tab.id
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search by ID or customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">ID</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Time</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Customer</th>
                            <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Amount</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Payment</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center text-[var(--text-muted)]">
                                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                    Loading transactions…
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center text-[var(--text-muted)]">
                                    <Calendar size={32} className="mx-auto mb-3 opacity-40" />
                                    No transactions found
                                </td>
                            </tr>
                        ) : filtered.map((tx) => (
                            <tr key={tx.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">
                                    #{tx.id.slice(-8).toUpperCase()}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                    {new Date(tx.createdAt).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit'
                                    })}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                    {tx.client
                                        ? `${tx.client.firstName || ''} ${tx.client.lastName || ''}`.trim() || 'Walk-in'
                                        : 'Walk-in'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                    ${Number(tx.total).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                    <PaymentBadge method={tx.paymentMethod} />
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={tx.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
