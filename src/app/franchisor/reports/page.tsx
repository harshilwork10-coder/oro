'use client';

import { useState } from 'react';
import { BarChart3, MapPin, TrendingUp, Calendar, Download } from 'lucide-react';

type ReportTab = 'sales' | 'locations' | 'trends';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('sales');
    const [dateRange, setDateRange] = useState('7d');

    const tabs: { id: ReportTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'sales', label: 'Sales', icon: BarChart3 },
        { id: 'locations', label: 'Locations', icon: MapPin },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
                <button className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                    <Download size={16} />
                    Export
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[var(--text-muted)]" />
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="ytd">Year to Date</option>
                    </select>
                </div>
                <select className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="">All Franchisees</option>
                    <option value="fr_1">Metro Holdings LLC</option>
                    <option value="fr_2">Bella Salon Group</option>
                </select>
                <select className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                    <option value="">All Locations</option>
                    <option value="loc_1">Metro Downtown</option>
                    <option value="loc_2">Metro North</option>
                </select>
            </div>

            <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                <BarChart3 size={64} className="mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tabs.find(t => t.id === activeTab)?.label} Report</h3>
                <p className="text-[var(--text-secondary)] mt-2">Read-only reports with franchise/location filters</p>
                <p className="text-xs text-[var(--text-muted)] mt-4">Charts and data tables coming soon</p>
            </div>
        </div>
    );
}

