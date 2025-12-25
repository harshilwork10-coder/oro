'use client';

import { useState } from 'react';
import { BarChart3, DollarSign, Users, Calendar, Download, TrendingUp } from 'lucide-react';
import { useLocation } from '../layout';

type ReportType = 'sales' | 'employees' | 'inventory' | 'appointments';

export default function ReportsPage() {
    const { currentLocation } = useLocation();
    const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
    const [dateRange, setDateRange] = useState('7d');

    const isRetail = currentLocation?.type === 'retail' || currentLocation?.type === 'both';
    const isSalon = currentLocation?.type === 'salon' || currentLocation?.type === 'both';

    const reports = [
        { id: 'sales', label: 'Sales Report', icon: DollarSign, available: true },
        { id: 'employees', label: 'Employee Performance', icon: Users, available: true },
        { id: 'inventory', label: 'Inventory Report', icon: BarChart3, available: isRetail },
        { id: 'appointments', label: 'Appointments Report', icon: Calendar, available: isSalon },
    ].filter(r => r.available);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
                <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                    <Download size={16} />
                    Export PDF
                </button>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-56 space-y-1">
                    {reports.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => setSelectedReport(report.id as ReportType)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedReport === report.id
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <report.icon size={18} />
                            {report.label}
                        </button>
                    ))}
                </div>

                {/* Report Content */}
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)]"
                        >
                            <option value="today">Today</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                        </select>
                    </div>

                    <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                        <BarChart3 size={64} className="mx-auto text-[var(--text-muted)] mb-4" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {reports.find(r => r.id === selectedReport)?.label}
                        </h3>
                        <p className="text-[var(--text-secondary)] mt-2">
                            Charts and data visualization coming soon
                        </p>
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-[var(--surface)]">
                                <p className="text-sm text-[var(--text-muted)]">Total</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">$12,450</p>
                            </div>
                            <div className="p-4 rounded-lg bg-[var(--surface)]">
                                <p className="text-sm text-[var(--text-muted)]">Average</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">$85.50</p>
                            </div>
                            <div className="p-4 rounded-lg bg-[var(--surface)]">
                                <p className="text-sm text-[var(--text-muted)]">Growth</p>
                                <p className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                                    <TrendingUp size={20} />
                                    +12%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
