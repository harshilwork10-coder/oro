'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BarChart3, DollarSign, Users, Clock, TrendingUp, Calendar,
    Download, RefreshCw, MapPin, AlertTriangle, Store
} from 'lucide-react';

interface LocationKPIs {
    id: string;
    name: string;
    address: string | null;
    grossSales: number;
    netSales: number;
    transactionCount: number;
    appointments: number;
    noShowRate: number;
}

interface OperatorDashboard {
    period: { from: string; to: string; label: string };
    summary: {
        totalLocations: number;
        grossSales: number;
        netSales: number;
        tips: number;
        transactionCount: number;
        avgTicket: number;
    };
    locations: LocationKPIs[];
    alerts: { type: string; message: string; locationName?: string }[];
}

type ReportPeriod = 'today' | 'wtd' | 'mtd';

export default function OperatorReportsPage() {
    const [dashboard, setDashboard] = useState<OperatorDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<ReportPeriod>('today');

    useEffect(() => {
        fetchDashboard();
    }, [period]);

    async function fetchDashboard() {
        setLoading(true);
        try {
            const res = await fetch(`/api/operator/reports?period=${period}`);
            if (res.ok) {
                const data = await res.json();
                setDashboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch operator dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    function exportPDF() {
        if (!dashboard) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>ORO 9 - Operator Report - ${dashboard.period.label}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                    h1 { color: #f97316; }
                    .header { border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
                    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                    .kpi { background: #f5f5f5; padding: 15px; border-radius: 8px; }
                    .kpi-label { font-size: 12px; color: #666; }
                    .kpi-value { font-size: 24px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #f97316; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Operator Performance Report</h1>
                    <p>Period: ${dashboard.period.label}</p>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                <div class="kpi-grid">
                    <div class="kpi">
                        <div class="kpi-label">Total Locations</div>
                        <div class="kpi-value">${dashboard.summary.totalLocations}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Gross Sales</div>
                        <div class="kpi-value">$${dashboard.summary.grossSales.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Net Sales</div>
                        <div class="kpi-value">$${dashboard.summary.netSales.toLocaleString()}</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-label">Transactions</div>
                        <div class="kpi-value">${dashboard.summary.transactionCount}</div>
                    </div>
                </div>
                <h2>Location Breakdown</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>Gross Sales</th>
                            <th>Net Sales</th>
                            <th>Transactions</th>
                            <th>Appointments</th>
                            <th>No-Show %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dashboard.locations.map(loc => `
                            <tr>
                                <td>${loc.name}</td>
                                <td>$${loc.grossSales.toLocaleString()}</td>
                                <td>$${loc.netSales.toLocaleString()}</td>
                                <td>${loc.transactionCount}</td>
                                <td>${loc.appointments}</td>
                                <td>${loc.noShowRate.toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    ORO 9 POS System | Operator Report | ${new Date().toLocaleString()}
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
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-300 mb-2">No Data Available</h3>
                <p className="text-stone-500">Could not load your reports.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">My Locations Report</h1>
                    <p className="text-sm text-stone-400">{dashboard.summary.totalLocations} location(s) • {dashboard.period.label}</p>
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
                        onClick={fetchDashboard}
                        className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2 mb-6">
                {(['today', 'wtd', 'mtd'] as ReportPeriod[]).map(p => (
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
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <Store size={14} />
                        LOCATIONS
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        {dashboard.summary.totalLocations}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <DollarSign size={14} />
                        GROSS SALES
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        ${dashboard.summary.grossSales.toLocaleString()}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <TrendingUp size={14} />
                        NET SALES
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        ${dashboard.summary.netSales.toLocaleString()}
                    </div>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
                        <BarChart3 size={14} />
                        TRANSACTIONS
                    </div>
                    <div className="text-2xl font-bold text-stone-100">
                        {dashboard.summary.transactionCount}
                    </div>
                </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Tips Collected</div>
                    <div className="text-lg font-semibold text-emerald-400">${dashboard.summary.tips.toLocaleString()}</div>
                </div>
                <div className="bg-stone-800/30 border border-stone-800 rounded-lg p-3">
                    <div className="text-stone-500 text-xs">Average Ticket</div>
                    <div className="text-lg font-semibold text-stone-200">${dashboard.summary.avgTicket.toFixed(2)}</div>
                </div>
            </div>

            {/* Alerts */}
            {dashboard.alerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Alerts
                    </h3>
                    <div className="space-y-2">
                        {dashboard.alerts.map((alert, i) => (
                            <div key={i} className="text-sm text-red-300">
                                {alert.locationName && <span className="font-medium">{alert.locationName}: </span>}
                                {alert.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Location Breakdown */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-800">
                    <h2 className="font-semibold text-stone-200">Location Performance</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-stone-500 font-medium">Location</th>
                                <th className="px-4 py-3 text-right text-stone-500 font-medium">Gross Sales</th>
                                <th className="px-4 py-3 text-right text-stone-500 font-medium">Net Sales</th>
                                <th className="px-4 py-3 text-right text-stone-500 font-medium">Transactions</th>
                                <th className="px-4 py-3 text-right text-stone-500 font-medium">Appointments</th>
                                <th className="px-4 py-3 text-right text-stone-500 font-medium">No-Show %</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard.locations.map(loc => (
                                <tr key={loc.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-stone-200">{loc.name}</div>
                                        {loc.address && <div className="text-xs text-stone-500">{loc.address}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-right text-stone-200">${loc.grossSales.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-emerald-400">${loc.netSales.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-stone-400">{loc.transactionCount}</td>
                                    <td className="px-4 py-3 text-right text-stone-400">{loc.appointments}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={loc.noShowRate > 10 ? 'text-red-400' : 'text-stone-400'}>
                                            {loc.noShowRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/operator/locations/${loc.id}/reports`}
                                            className="text-orange-400 hover:text-orange-300 text-xs font-medium"
                                        >
                                            Details →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
