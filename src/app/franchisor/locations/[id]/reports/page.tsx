'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Download, Calendar, DollarSign, Users, TrendingUp,
    Clock, BarChart3, FileText, Loader2, RefreshCw, Printer
} from 'lucide-react';

interface StoreReport {
    location: {
        id: string;
        name: string;
        address: string | null;
        franchiseeName: string;
        provisioningStatus: string;
    };
    period: {
        from: string;
        to: string;
        label: string;
    };
    summary: {
        grossSales: number;
        netSales: number;
        refunds: number;
        tips: number;
        tax: number;
        transactionCount: number;
        avgTicket: number;
        uniqueCustomers: number;
    };
    transactions: Array<{
        id: string;
        invoiceNumber: string | null;
        total: number;
        paymentMethod: string;
        status: string;
        createdAt: string;
    }>;
    employees: Array<{
        id: string;
        name: string;
        revenue: number;
        transactionCount: number;
        tips: number;
    }>;
}

type ReportPeriod = 'today' | 'wtd' | 'mtd' | 'ytd';

export default function StoreReportsPage() {
    const params = useParams();
    const locationId = params.id as string;

    const [report, setReport] = useState<StoreReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<ReportPeriod>('today');

    useEffect(() => {
        fetchReport();
    }, [locationId, period]);

    async function fetchReport() {
        setLoading(true);
        try {
            const res = await fetch(`/api/franchisor/locations/${locationId}/reports?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    }

    function exportPDF() {
        if (!report) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>ORO 9 - Store Report - ${report.location.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 800px; margin: 0 auto; }
                    h1 { color: #f97316; font-size: 24px; margin-bottom: 5px; }
                    h2 { color: #666; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #f97316; padding-bottom: 5px; }
                    .header { margin-bottom: 30px; }
                    .header p { margin: 5px 0; color: #666; }
                    .meta { display: flex; gap: 30px; margin-bottom: 20px; }
                    .meta-item { }
                    .meta-label { font-size: 11px; color: #999; text-transform: uppercase; }
                    .meta-value { font-size: 14px; font-weight: bold; }
                    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                    .kpi { background: #f5f5f5; padding: 15px; border-radius: 8px; }
                    .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; }
                    .kpi-value { font-size: 24px; font-weight: bold; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                    th { background: #f97316; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
                    .status-completed { color: green; }
                    .status-refunded { color: red; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ORO 9 - Store Report</h1>
                    <p><strong>${report.location.name}</strong></p>
                    <p>${report.location.address || 'No address'}</p>
                    <p>Franchisee: ${report.location.franchiseeName}</p>
                </div>
                
                <div class="meta">
                    <div class="meta-item">
                        <div class="meta-label">Report Period</div>
                        <div class="meta-value">${report.period.label}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Generated</div>
                        <div class="meta-value">${new Date().toLocaleString()}</div>
                    </div>
                </div>

                <h2>Financial Summary</h2>
                <div class="kpi-grid">
                    <div class="kpi">
                        <div class="kpi-label">Gross Sales</div>
                        <div class="kpi-value">$${report.summary.grossSales.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Net Sales</div>
                        <div class="kpi-value">$${report.summary.netSales.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Refunds</div>
                        <div class="kpi-value">$${report.summary.refunds.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Tips</div>
                        <div class="kpi-value">$${report.summary.tips.toLocaleString()}</div>
                    </div>
                </div>
                <div class="kpi-grid">
                    <div class="kpi">
                        <div class="kpi-label">Transactions</div>
                        <div class="kpi-value">${report.summary.transactionCount}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Avg Ticket</div>
                        <div class="kpi-value">$${report.summary.avgTicket.toFixed(2)}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Tax Collected</div>
                        <div class="kpi-value">$${report.summary.tax.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Unique Customers</div>
                        <div class="kpi-value">${report.summary.uniqueCustomers}</div>
                    </div>
                </div>

                <h2>Transaction Details</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date/Time</th>
                            <th>Amount</th>
                            <th>Payment</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.transactions.slice(0, 50).map(tx => `
                            <tr>
                                <td>${tx.invoiceNumber || '-'}</td>
                                <td>${new Date(tx.createdAt).toLocaleString()}</td>
                                <td>$${Number(tx.total).toFixed(2)}</td>
                                <td>${tx.paymentMethod}</td>
                                <td class="status-${tx.status.toLowerCase()}">${tx.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${report.transactions.length > 50 ? `<p style="color:#999;font-size:11px;">Showing first 50 of ${report.transactions.length} transactions</p>` : ''}

                ${report.employees.length > 0 ? `
                    <h2>Employee Performance</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Revenue</th>
                                <th>Transactions</th>
                                <th>Tips</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.employees.map(emp => `
                                <tr>
                                    <td>${emp.name}</td>
                                    <td>$${emp.revenue.toLocaleString()}</td>
                                    <td>${emp.transactionCount}</td>
                                    <td>$${emp.tips.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : ''}

                <div class="footer">
                    ORO 9 POS System | Report Version 1.0 | Generated ${new Date().toLocaleString()} | Confidential
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="text-center py-12">
                <FileText className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-300 mb-2">Report Not Available</h3>
                <p className="text-stone-500 mb-4">Could not load report for this location.</p>
                <Link href="/franchisor/locations" className="text-orange-400 hover:underline">
                    ← Back to Locations
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/franchisor/locations" className="text-stone-400 hover:text-stone-200">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">{report.location.name}</h1>
                        <p className="text-sm text-stone-400">
                            {report.location.address} • {report.location.franchiseeName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-stone-900 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download size={16} />
                        Export PDF
                    </button>
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2 mb-6">
                {(['today', 'wtd', 'mtd', 'ytd'] as ReportPeriod[]).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                                ? 'bg-orange-500 text-stone-900'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        {p.toUpperCase()}
                    </button>
                ))}
                <span className="text-stone-500 text-sm ml-4">
                    {report.period.label}
                </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <DollarSign size={14} />
                        GROSS SALES
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        ${report.summary.grossSales.toLocaleString()}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <TrendingUp size={14} />
                        NET SALES
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        ${report.summary.netSales.toLocaleString()}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <BarChart3 size={14} />
                        TRANSACTIONS
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        {report.summary.transactionCount}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <Users size={14} />
                        AVG TICKET
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        ${report.summary.avgTicket.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Tips</div>
                    <div className="text-lg font-semibold text-stone-200">${report.summary.tips.toLocaleString()}</div>
                </div>
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Tax Collected</div>
                    <div className="text-lg font-semibold text-stone-200">${report.summary.tax.toLocaleString()}</div>
                </div>
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Refunds</div>
                    <div className="text-lg font-semibold text-red-400">${report.summary.refunds.toLocaleString()}</div>
                </div>
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Unique Customers</div>
                    <div className="text-lg font-semibold text-stone-200">{report.summary.uniqueCustomers}</div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
                    <h2 className="font-semibold text-stone-200">Transaction Details</h2>
                    <span className="text-xs text-stone-500">{report.transactions.length} transactions</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-800/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Invoice</th>
                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Date/Time</th>
                                <th className="px-4 py-2 text-right text-stone-500 font-medium">Amount</th>
                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Payment</th>
                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                                    <td className="px-4 py-2 text-stone-300">{tx.invoiceNumber || '-'}</td>
                                    <td className="px-4 py-2 text-stone-400 text-xs">
                                        {new Date(tx.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-stone-200 font-medium">
                                        ${Number(tx.total).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-stone-400">{tx.paymentMethod}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${tx.status === 'COMPLETED'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : tx.status === 'REFUNDED'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-stone-500/20 text-stone-400'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employees Table */}
            {report.employees.length > 0 && (
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-stone-800">
                        <h2 className="font-semibold text-stone-200">Employee Performance</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-stone-800/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Employee</th>
                                <th className="px-4 py-2 text-right text-stone-500 font-medium">Revenue</th>
                                <th className="px-4 py-2 text-right text-stone-500 font-medium">Transactions</th>
                                <th className="px-4 py-2 text-right text-stone-500 font-medium">Tips</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.employees.map(emp => (
                                <tr key={emp.id} className="border-b border-stone-800/50">
                                    <td className="px-4 py-2 text-stone-200">{emp.name}</td>
                                    <td className="px-4 py-2 text-right text-stone-200">${emp.revenue.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-stone-400">{emp.transactionCount}</td>
                                    <td className="px-4 py-2 text-right text-emerald-400">${emp.tips.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
