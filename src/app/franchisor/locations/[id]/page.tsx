'use client';

/**
 * Location 360 Page - A-to-Z view for a single location
 * 
 * Features:
 * - Sticky header with location info
 * - Quick KPIs (Today/WTD toggle)
 * - Lazy-loaded tabs
 * - Alerts panel
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Phone,
    Monitor,
    AlertTriangle,
    Users,
    Calendar,
    DollarSign,
    UserCircle,
    FileText,
    Settings,
    TrendingUp,
    RefreshCw
} from 'lucide-react';

interface LocationHeader {
    id: string;
    name: string;
    storeCode: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    status: string;
    phone: string;
    franchisee: string;
    devices: {
        paired: number;
        online: number;
        lastSync: string | null;
    };
}

interface KPIs {
    grossSales: number;
    netSales: number;
    refunds: number;
    tips: number;
    transactionCount: number;
    avgTicket: number;
    appointments: {
        booked: number;
        completed: number;
        noShows: number;
        cancelled: number;
    };
    noShowRate: number;
    uniqueCustomers: number;
    walkIns: number;
}

interface Alert {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
}

interface Location360Data {
    header: LocationHeader;
    dateRange: { preset: string; from: string; to: string };
    kpis: KPIs;
    alerts: Alert[];
    tabs: string[];
}

export default function Location360Page() {
    const params = useParams();
    const router = useRouter();
    const locationId = params?.id as string;

    const [data, setData] = useState<Location360Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState<'TODAY' | 'WTD' | 'MTD'>('TODAY');
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch Location 360 data
    useEffect(() => {
        if (!locationId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/franchisor/locations/${locationId}/360?range=${selectedRange}`);
                if (!res.ok) throw new Error('Failed to load location');
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [locationId, selectedRange]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'sales', label: 'Sales', icon: DollarSign },
        { id: 'staff', label: 'Staff', icon: UserCircle },
        { id: 'transactions', label: 'Transactions', icon: FileText },
        { id: 'operations', label: 'Operations', icon: Settings }
    ];

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-950 text-white">
                <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-lg">{error || 'Location not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-4 py-2 bg-stone-800 rounded-lg hover:bg-stone-700"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const { header, kpis, alerts } = data;

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800">
                <div className="px-6 py-4">
                    {/* Back + Location Name */}
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-6 h-6 text-orange-400" />
                                <h1 className="text-xl font-bold">{header.name}</h1>
                                <span className={`text-xs px-2 py-0.5 rounded ${header.status === 'ACTIVE'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : header.status === 'PROVISIONING'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-stone-700 text-stone-400'
                                    }`}>
                                    {header.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-stone-400">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {header.city}, {header.state}
                                </span>
                                {header.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {header.phone}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Monitor className="w-3 h-3" />
                                    {header.devices.online}/{header.devices.paired} online
                                </span>
                                <span>Franchisee: {header.franchisee}</span>
                            </div>
                        </div>

                        {/* Date Range Toggle */}
                        <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-1">
                            {(['TODAY', 'WTD', 'MTD'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setSelectedRange(range)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedRange === range
                                            ? 'bg-orange-500 text-white'
                                            : 'text-stone-400 hover:text-white'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick KPIs */}
                    <div className="grid grid-cols-6 gap-4">
                        <KPICard label="Net Sales" value={formatCurrency(kpis.netSales)} />
                        <KPICard label="Transactions" value={kpis.transactionCount.toString()} />
                        <KPICard label="Avg Ticket" value={formatCurrency(kpis.avgTicket)} />
                        <KPICard label="Appointments" value={`${kpis.appointments.completed}/${kpis.appointments.booked}`} />
                        <KPICard label="No-Show %" value={`${kpis.noShowRate.toFixed(1)}%`} highlight={kpis.noShowRate > 15} />
                        <KPICard label="Unique Customers" value={kpis.uniqueCustomers.toString()} />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-orange-500 text-orange-400'
                                    : 'border-transparent text-stone-400 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Alerts (if any) */}
            {alerts.length > 0 && (
                <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <div className="flex-1 flex flex-wrap gap-3">
                            {alerts.map((alert, idx) => (
                                <span
                                    key={idx}
                                    className={`text-sm px-3 py-1 rounded-full ${alert.severity === 'CRITICAL'
                                            ? 'bg-red-500/20 text-red-400'
                                            : alert.severity === 'WARNING'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                        }`}
                                >
                                    {alert.message}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <main className="p-6">
                {activeTab === 'overview' && <OverviewTab locationId={locationId} range={selectedRange} />}
                {activeTab === 'customers' && <CustomersTab locationId={locationId} range={selectedRange} />}
                {activeTab === 'staff' && <StaffTab locationId={locationId} range={selectedRange} />}
                {activeTab === 'transactions' && <TransactionsTab locationId={locationId} />}
                {/* Other tabs render placeholders for now */}
                {['bookings', 'sales', 'operations'].includes(activeTab) && (
                    <div className="flex items-center justify-center py-20 text-stone-500">
                        <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab coming soon...</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// KPI Card Component
function KPICard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`px-4 py-2 rounded-lg ${highlight ? 'bg-red-500/20' : 'bg-stone-800'}`}>
            <p className="text-xs text-stone-400">{label}</p>
            <p className={`text-lg font-bold ${highlight ? 'text-red-400' : ''}`}>{value}</p>
        </div>
    );
}

// Overview Tab
function OverviewTab({ locationId, range }: { locationId: string; range: string }) {
    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-stone-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">7-Day Sales Trend</h3>
                <div className="h-48 flex items-center justify-center text-stone-500">
                    Chart placeholder
                </div>
            </div>
            <div className="bg-stone-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Appointment Volume</h3>
                <div className="h-48 flex items-center justify-center text-stone-500">
                    Chart placeholder
                </div>
            </div>
        </div>
    );
}

// Customers Tab (lazy loaded)
function CustomersTab({ locationId, range }: { locationId: string; range: string }) {
    const [data, setData] = useState<{ summary?: { uniqueCustomers: number; newCustomers: number; returningCustomers: number }; vipList?: Array<{ id: string; firstName: string; lastName: string; totalSpent: number; visitCount: number }> } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/franchisor/locations/${locationId}/customers?range=${range}`)
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [locationId, range]);

    if (loading) return <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-stone-900 rounded-xl p-4">
                    <p className="text-sm text-stone-400">Unique Customers</p>
                    <p className="text-2xl font-bold">{data?.summary?.uniqueCustomers || 0}</p>
                </div>
                <div className="bg-stone-900 rounded-xl p-4">
                    <p className="text-sm text-stone-400">New</p>
                    <p className="text-2xl font-bold text-emerald-400">{data?.summary?.newCustomers || 0}</p>
                </div>
                <div className="bg-stone-900 rounded-xl p-4">
                    <p className="text-sm text-stone-400">Returning</p>
                    <p className="text-2xl font-bold text-blue-400">{data?.summary?.returningCustomers || 0}</p>
                </div>
            </div>

            {/* VIP List */}
            <div className="bg-stone-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">VIP Customers (Top Spenders)</h3>
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-sm text-stone-400 border-b border-stone-800">
                            <th className="pb-2">Customer</th>
                            <th className="pb-2">Total Spent</th>
                            <th className="pb-2">Visits</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.vipList?.map((cust) => (
                            <tr key={cust.id} className="border-b border-stone-800">
                                <td className="py-3">{cust.firstName} {cust.lastName}</td>
                                <td className="py-3">${cust.totalSpent.toFixed(2)}</td>
                                <td className="py-3">{cust.visitCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Staff Tab (lazy loaded)
function StaffTab({ locationId, range }: { locationId: string; range: string }) {
    const [data, setData] = useState<{ leaderboard?: Array<{ id: string; name: string; revenue: number; transactionCount: number; avgTicket: number; tips: number }> } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/franchisor/locations/${locationId}/staff?range=${range}`)
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [locationId, range]);

    if (loading) return <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="bg-stone-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Staff Leaderboard</h3>
            <table className="w-full">
                <thead>
                    <tr className="text-left text-sm text-stone-400 border-b border-stone-800">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Employee</th>
                        <th className="pb-2">Revenue</th>
                        <th className="pb-2">Transactions</th>
                        <th className="pb-2">Avg Ticket</th>
                        <th className="pb-2">Tips</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.leaderboard?.map((emp, idx) => (
                        <tr key={emp.id} className="border-b border-stone-800">
                            <td className="py-3 text-stone-500">{idx + 1}</td>
                            <td className="py-3 font-medium">{emp.name}</td>
                            <td className="py-3 text-emerald-400">${emp.revenue.toFixed(2)}</td>
                            <td className="py-3">{emp.transactionCount}</td>
                            <td className="py-3">${emp.avgTicket.toFixed(2)}</td>
                            <td className="py-3">${emp.tips.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Transactions Tab (lazy loaded)
function TransactionsTab({ locationId }: { locationId: string }) {
    const [data, setData] = useState<{ transactions?: Array<{ id: string; invoiceNumber: string; createdAt: string; type: string; total: number; paymentMethod: string; employee?: { name: string } }> } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const to = today.toISOString();

        fetch(`/api/franchisor/locations/${locationId}/transactions?from=${from}&to=${to}`)
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [locationId]);

    if (loading) return <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="bg-stone-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Transaction Ledger</h3>
                <button className="px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-lg text-sm font-medium">
                    Export CSV
                </button>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-stone-400 border-b border-stone-800">
                        <th className="pb-2">Invoice</th>
                        <th className="pb-2">Time</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Total</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2">Employee</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.transactions?.map((tx) => (
                        <tr key={tx.id} className="border-b border-stone-800">
                            <td className="py-2 font-mono text-xs">{tx.invoiceNumber || tx.id.slice(-8)}</td>
                            <td className="py-2 text-stone-400">{new Date(tx.createdAt).toLocaleTimeString()}</td>
                            <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${tx.type === 'REFUND' ? 'bg-red-500/20 text-red-400' :
                                        tx.type === 'VOID' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                    {tx.type}
                                </span>
                            </td>
                            <td className="py-2 font-medium">${tx.total.toFixed(2)}</td>
                            <td className="py-2">{tx.paymentMethod}</td>
                            <td className="py-2">{tx.employee?.name || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
