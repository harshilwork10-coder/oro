'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    BarChart3, DollarSign, Users, Calendar, CreditCard,
    TrendingUp, FileText, Receipt, Gift, Package,
    Search, Clock, AlertTriangle, Download
} from 'lucide-react';
import { useLocation } from '../layout';

type ReportCategory = 'all' | 'period' | 'payment' | 'employee' | 'products' | 'financial';

interface ReportItem {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    category: ReportCategory;
    priority?: boolean;
    comingSoon?: boolean;
}

const reports: ReportItem[] = [
    // Period Reports
    { id: 'daily', name: 'Daily Sales / Z-Report', description: 'End of day sales summary with all transactions', icon: FileText, href: '/dashboard/reports/z-report', category: 'period', priority: true },
    { id: 'weekly', name: 'Weekly Summary', description: 'Week-over-week sales trends and comparisons', icon: TrendingUp, href: '/owner/reports/weekly', category: 'period' },
    { id: 'monthly', name: 'Monthly Summary', description: 'Monthly sales, expenses, and profit overview', icon: Calendar, href: '/owner/reports/monthly', category: 'period' },
    { id: 'quarterly', name: 'Quarterly Summary', description: 'Quarterly business performance and trends', icon: BarChart3, href: '/owner/reports/quarterly', category: 'period' },

    // Payment Reports
    { id: 'cash-card', name: 'Cash vs Card Breakdown', description: 'Revenue split by payment method with tip breakdown', icon: CreditCard, href: '/dashboard/reports/sales/cash-card', category: 'payment', priority: true },
    { id: 'cc-batch', name: 'Credit Card Batch Report', description: 'Transaction time, auth code - for disputes', icon: Receipt, href: '/owner/reports/cc-batch', category: 'payment' },
    { id: 'tips', name: 'Tips Report', description: 'Tips collected by stylist/employee', icon: DollarSign, href: '/dashboard/reports/tips', category: 'payment' },
    { id: 'gift-cards', name: 'Gift Card Report', description: 'Sold, redeemed, outstanding balance', icon: Gift, href: '/owner/reports/gift-cards', category: 'payment' },

    // Employee Reports
    { id: 'employee-sales', name: 'Sales by Employee', description: 'Revenue and transaction count per employee', icon: Users, href: '/dashboard/reports/employee/sales', category: 'employee', priority: true },
    { id: 'commissions', name: 'Commission Payouts', description: 'Stylist commissions and payout history', icon: DollarSign, href: '/dashboard/reports/employee/payouts', category: 'employee' },
    { id: 'hours-wages', name: 'Hours & Wages', description: 'Employee hours worked and wage calculations', icon: Clock, href: '/dashboard/reports/employee/hours-wages', category: 'employee' },

    // Products & Services
    { id: 'product-sales', name: 'Product Sales Report', description: 'Retail product sales and top sellers', icon: Package, href: '/owner/reports/product-sales', category: 'products' },
    { id: 'service-sales', name: 'Service Sales Report', description: 'Sales breakdown by service category', icon: BarChart3, href: '/owner/reports/service-sales', category: 'products' },
    { id: 'top-sellers', name: 'Top Sellers', description: 'Best performing products and services', icon: TrendingUp, href: '/dashboard/reports/inventory/top-sellers', category: 'products' },

    // Financial Reports
    { id: 'tax-summary', name: 'Tax Summary', description: 'Sales tax collected for filing', icon: FileText, href: '/dashboard/reports/sales', category: 'financial' },
    { id: 'refunds-voids', name: 'Refunds & Voids', description: 'Voided transactions and refunds issued', icon: AlertTriangle, href: '/dashboard/reports/transactions', category: 'financial' },
    { id: 'deals', name: 'Deals & Promotions', description: 'Active deals performance and savings', icon: Gift, href: '/dashboard/reports/deals', category: 'financial' },
];

const categoryLabels: Record<ReportCategory, string> = {
    all: 'All Reports',
    period: 'Period Summaries',
    payment: 'Payment Reports',
    employee: 'Employee Reports',
    products: 'Products & Services',
    financial: 'Financial Reports'
};

export default function ReportsPage() {
    const { currentLocation } = useLocation();
    const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
            const matchesSearch = searchQuery === '' ||
                report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                report.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const priorityReports = filteredReports.filter(r => r.priority);
    const otherReports = filteredReports.filter(r => !r.priority);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-amber-400" />
                        Sales Reports
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {filteredReports.length} reports available
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors">
                    <Download size={18} />
                    Export All
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedCategory(key as ReportCategory)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === key
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Priority Reports */}
            {priorityReports.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">
                        Priority Reports
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {priorityReports.map((report) => (
                            <ReportCard key={report.id} report={report} isPriority />
                        ))}
                    </div>
                </div>
            )}

            {/* Other Reports */}
            {otherReports.length > 0 && (
                <div>
                    {priorityReports.length > 0 && (
                        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                            Other Reports
                        </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherReports.map((report) => (
                            <ReportCard key={report.id} report={report} />
                        ))}
                    </div>
                </div>
            )}

            {/* No Results */}
            {filteredReports.length === 0 && (
                <div className="text-center py-12">
                    <Search className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">No reports found matching your search</p>
                </div>
            )}
        </div>
    );
}

function ReportCard({ report, isPriority }: { report: ReportItem; isPriority?: boolean }) {
    const Icon = report.icon;

    return (
        <Link
            href={report.href}
            className={`group relative block p-4 rounded-xl border transition-all duration-200 ${isPriority
                    ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30 hover:border-amber-400'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
                } hover:shadow-lg`}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${isPriority
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                    }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors truncate">
                            {report.name}
                        </h3>
                        {isPriority && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500 text-black rounded">
                                Priority
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {report.description}
                    </p>
                </div>
            </div>
        </Link>
    );
}
