'use client';

import { useState, useEffect } from 'react';
import { FileCheck, AlertTriangle, CheckCircle, XCircle, DollarSign, Package, Search, Plus, Trash2 } from 'lucide-react';

interface POSummary {
    id: string;
    poNumber: string;
    supplier: string;
    receivedAt: string;
    itemCount: number;
    totalUnits: number;
    totalCost: number;
    matched: boolean;
    invoiceNumber: string | null;
    items: {
        id: string;
        productId: string;
        productName: string;
        barcode: string | null;
        orderedQty: number;
        unitCost: number;
        lineCost: number;
    }[];
}

interface InvoiceItem {
    productId: string;
    name: string;
    quantity: number;
    unitCost: number;
}

interface Discrepancy {
    type: string;
    severity: string;
    productName: string;
    message: string;
    costImpact: number;
    poQty?: number;
    invoiceQty?: number;
    poCost?: number;
    invoiceCost?: number;
}

const SEVERITY_COLORS = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: XCircle },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle },
};

export default function InvoiceMatchPage() {
    const [pos, setPOs] = useState<POSummary[]>([]);
    const [selectedPO, setSelectedPO] = useState<POSummary | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceTotal, setInvoiceTotal] = useState<number | ''>('');
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [matchResult, setMatchResult] = useState<any>(null);
    const [matching, setMatching] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/inventory/invoice-match')
            .then(r => r.json())
            .then(data => {
                setPOs(data.purchaseOrders || []);
                setStats(data.stats || null);
            })
            .catch(() => { });
    }, []);

    // When selecting a PO, pre-populate invoice items from PO items
    const selectPO = (po: POSummary) => {
        setSelectedPO(po);
        setMatchResult(null);
        setInvoiceNumber('');
        setInvoiceTotal('');
        setInvoiceItems(po.items.map(item => ({
            productId: item.productId,
            name: item.productName,
            quantity: item.orderedQty,
            unitCost: item.unitCost,
        })));
    };

    const updateInvoiceItem = (index: number, field: string, value: any) => {
        setInvoiceItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const removeInvoiceItem = (index: number) => {
        setInvoiceItems(prev => prev.filter((_, i) => i !== index));
    };

    const addInvoiceItem = () => {
        setInvoiceItems(prev => [...prev, { productId: '', name: '', quantity: 0, unitCost: 0 }]);
    };

    const handleMatch = async () => {
        if (!selectedPO || !invoiceNumber) return;
        setMatching(true);
        const res = await fetch('/api/inventory/invoice-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'match',
                poId: selectedPO.id,
                invoiceNumber,
                invoiceItems,
                invoiceTotal: invoiceTotal || undefined,
            }),
        });
        const data = await res.json();
        setMatchResult(data);
        setMatching(false);
    };

    const calcInvoiceTotal = () =>
        Math.round(invoiceItems.reduce((s, i) => s + (i.quantity * i.unitCost), 0) * 100) / 100;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileCheck size={28} className="text-blue-400" />
                        <div>
                            <h1 className="text-2xl font-bold">Invoice Matching</h1>
                            <p className="text-sm text-[var(--text-muted)]">Compare vendor invoices against Purchase Orders — catch billing errors</p>
                        </div>
                    </div>
                    {stats && (
                        <div className="flex gap-4 text-sm">
                            <span className="text-green-400">✅ {stats.matched} matched</span>
                            <span className="text-amber-400">⏳ {stats.unmatched} unmatched</span>
                            <span className="text-[var(--text-muted)]">${stats.totalValue?.toLocaleString()} total</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: PO List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Received POs</h3>
                        {pos.map(po => (
                            <button
                                key={po.id}
                                onClick={() => selectPO(po)}
                                className={`w-full p-4 rounded-xl border text-left transition-all ${selectedPO?.id === po.id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : po.matched
                                            ? 'border-green-500/30 bg-green-500/5'
                                            : 'border-[var(--border)] hover:border-blue-500/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[var(--text-primary)]">{po.poNumber}</span>
                                    {po.matched ? (
                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                            <CheckCircle size={12} /> Matched
                                        </span>
                                    ) : (
                                        <span className="text-xs text-amber-400">Unmatched</span>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mt-1">{po.supplier}</p>
                                <div className="flex gap-3 text-xs text-[var(--text-muted)] mt-2">
                                    <span>{po.itemCount} items</span>
                                    <span>{po.totalUnits} units</span>
                                    <span className="text-green-400">${po.totalCost.toFixed(2)}</span>
                                </div>
                                {po.invoiceNumber && (
                                    <p className="text-xs text-blue-400 mt-1">Invoice: {po.invoiceNumber}</p>
                                )}
                            </button>
                        ))}
                        {pos.length === 0 && (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                <Package size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No received POs to match</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Invoice Entry + Results */}
                    <div className="lg:col-span-2 space-y-4">
                        {selectedPO ? (
                            <>
                                {/* Invoice Header */}
                                <div className="p-4 rounded-xl border border-[var(--border)] space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <DollarSign size={18} className="text-green-400" />
                                        Enter Invoice Details for {selectedPO.poNumber}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-[var(--text-muted)] block mb-1">Invoice Number *</label>
                                            <input
                                                value={invoiceNumber}
                                                onChange={e => setInvoiceNumber(e.target.value)}
                                                placeholder="e.g. INV-2026-1234"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[var(--text-muted)] block mb-1">Invoice Total ($)</label>
                                            <input
                                                type="number"
                                                value={invoiceTotal}
                                                onChange={e => setInvoiceTotal(e.target.value ? parseFloat(e.target.value) : '')}
                                                placeholder="Optional"
                                                step="0.01"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Items Table */}
                                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                                    <div className="bg-[var(--surface)] px-4 py-2 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[var(--text-secondary)]">Invoice Line Items</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            Calc total: <span className="text-green-400 font-bold">${calcInvoiceTotal().toFixed(2)}</span>
                                        </span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-[var(--text-muted)]">Product</th>
                                                <th className="text-right px-3 py-2 text-[var(--text-muted)] w-24">Qty</th>
                                                <th className="text-right px-3 py-2 text-[var(--text-muted)] w-28">Unit Cost</th>
                                                <th className="text-right px-3 py-2 text-[var(--text-muted)] w-24">Line $</th>
                                                <th className="w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceItems.map((item, i) => (
                                                <tr key={i} className="border-t border-[var(--border)]">
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            value={item.name}
                                                            onChange={e => updateInvoiceItem(i, 'name', e.target.value)}
                                                            className="w-full bg-transparent text-[var(--text-primary)] text-sm focus:outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => updateInvoiceItem(i, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-right text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="number"
                                                            value={item.unitCost}
                                                            onChange={e => updateInvoiceItem(i, 'unitCost', parseFloat(e.target.value) || 0)}
                                                            step="0.01"
                                                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-right text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right text-[var(--text-muted)]">
                                                        ${(item.quantity * item.unitCost).toFixed(2)}
                                                    </td>
                                                    <td className="px-2">
                                                        <button onClick={() => removeInvoiceItem(i)} className="text-red-400 hover:text-red-300 p-1">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="px-3 py-2 border-t border-[var(--border)]">
                                        <button onClick={addInvoiceItem} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            <Plus size={12} /> Add Item
                                        </button>
                                    </div>
                                </div>

                                {/* Match Button */}
                                <button
                                    onClick={handleMatch}
                                    disabled={!invoiceNumber || matching}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {matching ? (
                                        <><Search size={16} className="animate-spin" /> Matching...</>
                                    ) : (
                                        <><FileCheck size={16} /> Match Invoice Against PO</>
                                    )}
                                </button>

                                {/* Match Results */}
                                {matchResult && (
                                    <div className="space-y-3">
                                        {/* Summary */}
                                        <div className={`p-4 rounded-xl border ${matchResult.summary?.status === 'CLEAN'
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : matchResult.summary?.status === 'CRITICAL'
                                                    ? 'bg-red-500/10 border-red-500/30'
                                                    : 'bg-amber-500/10 border-amber-500/30'
                                            }`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                {matchResult.summary?.status === 'CLEAN' ? (
                                                    <CheckCircle size={20} className="text-green-400" />
                                                ) : (
                                                    <AlertTriangle size={20} className={matchResult.summary?.status === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'} />
                                                )}
                                                <span className="font-bold">
                                                    {matchResult.summary?.status === 'CLEAN'
                                                        ? '✅ Invoice Matches PO — No Discrepancies!'
                                                        : `⚠️ ${matchResult.summary?.discrepancyCount} Discrepancies Found`
                                                    }
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                                <div>
                                                    <span className="text-[var(--text-muted)]">PO Total</span>
                                                    <p className="font-bold">${matchResult.summary?.poCost?.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[var(--text-muted)]">Invoice Total</span>
                                                    <p className="font-bold">${matchResult.summary?.invoiceCost?.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[var(--text-muted)]">Difference</span>
                                                    <p className={`font-bold ${matchResult.summary?.totalDifference > 0 ? 'text-red-400' : matchResult.summary?.totalDifference < 0 ? 'text-green-400' : 'text-green-400'}`}>
                                                        {matchResult.summary?.totalDifference > 0 ? '+' : ''}${matchResult.summary?.totalDifference?.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Discrepancy List */}
                                        {matchResult.discrepancies?.map((d: Discrepancy, i: number) => {
                                            const colors = SEVERITY_COLORS[d.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.warning;
                                            const Icon = colors.icon;
                                            return (
                                                <div key={i} className={`p-3 rounded-xl border ${colors.bg} ${colors.border} flex items-start gap-3`}>
                                                    <Icon size={16} className={`${colors.text} mt-0.5 flex-shrink-0`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-[var(--text-primary)]">{d.productName}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                                                                {d.type.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">{d.message}</p>
                                                        {d.costImpact !== 0 && (
                                                            <p className={`text-xs font-medium mt-1 ${d.costImpact > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                                Cost impact: {d.costImpact > 0 ? '+' : ''}${d.costImpact.toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
                                <div className="text-center">
                                    <FileCheck size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Select a PO to Match</p>
                                    <p className="text-sm mt-1">Pick a received Purchase Order from the left</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
