'use client';

import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Download, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '../../layout';

interface ProductData {
    summary: {
        totalRevenue: number;
        unitsSold: number;
        avgPrice: number;
        topCategory: string;
    };
    topProducts: {
        id: string;
        name: string;
        category: string;
        unitsSold: number;
        revenue: number;
        trend: number;
    }[];
    categoryBreakdown: {
        category: string;
        revenue: number;
        percentage: number;
    }[];
}

export default function ProductSalesReportPage() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProductData | null>(null);
    const [dateRange, setDateRange] = useState('30d');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProductData();
    }, [currentLocation?.id, dateRange]);

    const fetchProductData = async () => {
        if (!currentLocation?.id) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/reports/top-sellers?franchiseId=${currentLocation.id}&range=${dateRange}&type=product`);

            if (!res.ok) throw new Error('Failed to fetch product sales report');

            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching product data:', err);
            setError('Failed to load product sales report');
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
                            <Package className="w-7 h-7 text-amber-400" />
                            Product Sales Report
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Retail product performance and top sellers
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Total Revenue</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(data.summary.totalRevenue)}</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Units Sold</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{data.summary.unitsSold.toLocaleString()}</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Avg Price</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(data.summary.avgPrice)}</p>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-muted)]">Top Category</p>
                            <p className="text-xl font-bold text-amber-400 mt-1">{data.summary.topCategory || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Products */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Top Selling Products</h3>
                            </div>
                            <div className="divide-y divide-[var(--border)]">
                                {data.topProducts.length > 0 ? (
                                    data.topProducts.slice(0, 10).map((product, idx) => (
                                        <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-hover)] rounded-full">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[var(--text-primary)] truncate">{product.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{product.category} • {product.unitsSold} units</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(product.revenue)}</p>
                                                {product.trend !== 0 && (
                                                    <span className={`text-xs flex items-center justify-end gap-1 ${product.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {product.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {Math.abs(product.trend)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-[var(--text-muted)]">
                                        No product sales data
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Sales by Category</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {data.categoryBreakdown.length > 0 ? (
                                    data.categoryBreakdown.map((cat) => (
                                        <div key={cat.category}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm text-[var(--text-secondary)]">{cat.category}</span>
                                                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(cat.revenue)}</span>
                                            </div>
                                            <div className="w-full bg-[var(--surface-hover)] rounded-full h-2">
                                                <div
                                                    className="bg-amber-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-[var(--text-muted)]">
                                        No category data
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
