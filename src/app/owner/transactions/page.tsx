'use client';

import { useState } from 'react';
import { Search, Download, CreditCard, DollarSign, RefreshCw, MoreHorizontal, Calendar } from 'lucide-react';

type TransactionTab = 'all' | 'completed' | 'refunded' | 'voided';

const MOCK_TRANSACTIONS = [
    { id: '#TX-1234', amount: 45.99, method: 'Card', status: 'completed', items: 3, time: '2:45 PM', employee: 'Emma' },
    { id: '#TX-1233', amount: 128.50, method: 'Cash', status: 'completed', items: 7, time: '2:15 PM', employee: 'Alex' },
    { id: '#TX-1232', amount: 23.00, method: 'Card', status: 'refunded', items: 1, time: '1:32 PM', employee: 'Emma' },
    { id: '#TX-1231', amount: 89.99, method: 'Card', status: 'completed', items: 4, time: '12:45 PM', employee: 'Maria' },
    { id: '#TX-1230', amount: 15.00, method: 'Cash', status: 'voided', items: 1, time: '11:30 AM', employee: 'Alex' },
];

function PaymentBadge({ method }: { method: string }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${method === 'Card' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
            {method === 'Card' ? <CreditCard size={12} /> : <DollarSign size={12} />}
            {method}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        completed: 'bg-emerald-500/20 text-emerald-400',
        refunded: 'bg-amber-500/20 text-amber-400',
        voided: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status]}`}>
            {status === 'refunded' && <RefreshCw size={10} />}
            {status}
        </span>
    );
}

export default function TransactionsPage() {
    const [activeTab, setActiveTab] = useState<TransactionTab>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs: { id: TransactionTab; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'completed', label: 'Completed' },
        { id: 'refunded', label: 'Refunded' },
        { id: 'voided', label: 'Voided' },
    ];

    const filteredTx = MOCK_TRANSACTIONS.filter(tx => {
        if (activeTab !== 'all') return tx.status === activeTab;
        return true;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transactions</h1>
                <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                    <Download size={16} />
                    Export
                </button>
            </div>

            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">
                    <Calendar size={16} />
                    Today
                </button>
            </div>

            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">ID</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Time</th>
                            <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Amount</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Items</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Payment</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Employee</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTx.map((tx) => (
                            <tr key={tx.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                <td className="px-4 py-3 font-mono text-sm text-[var(--text-primary)]">{tx.id}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{tx.time}</td>
                                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">${tx.amount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-center text-[var(--text-muted)]">{tx.items}</td>
                                <td className="px-4 py-3"><PaymentBadge method={tx.method} /></td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{tx.employee}</td>
                                <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                                <td className="px-4 py-3">
                                    <button className="p-1 hover:bg-[var(--surface-active)] rounded">
                                        <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
