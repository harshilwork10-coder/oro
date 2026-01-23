'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3, MapPin, TrendingUp, Calendar, Download, Users, DollarSign,
    Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, Trophy, Activity, Heart, Scissors, Building2
} from 'lucide-react';
import LocationSwitcher from '@/components/franchisor/LocationSwitcher';
import { useRouter } from 'next/navigation';

type ReportTab = 'command-center' | 'leaderboard' | 'go-live' | 'retention' | 'stylists';

interface LocationSelection {
    id: string;
    name: string;
    city?: string;
    state?: string;
}

interface CommandCenterData {
    locations: { total: number; active: number; pending: number; suspended: number };
    appointments: { booked: number; completed: number; upcoming: number; noShows: number };
    walkIns: number;
    totalVisits: number;
    uniqueCustomers: number;
    revenue: number;
    noShowRate: number;
    alerts: { type: string; message: string }[];
}

interface LeaderboardLocation {
    rank: number;
    id: string;
    name: string;
    revenue: number;
    totalVisits: number;
    uniqueCustomers: number;
    avgTicket: number;
    noShowRate: number;
}

interface GoLiveLocation {
    id: string;
    name: string;
    franchisee: string;
    status: string;
    daysStuck: number;
    progressPercent: number;
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('command-center');
    const [loading, setLoading] = useState(true);
    const [commandCenter, setCommandCenter] = useState<CommandCenterData | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardLocation[]>([]);
    const [goLive, setGoLive] = useState<{ summary: any; locations: GoLiveLocation[] } | null>(null);
    const [retention, setRetention] = useState<any>(null);
    const [stylists, setStylists] = useState<any>(null);
    const [period, setPeriod] = useState('mtd');

    // Location switcher state
    const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
    const isNetworkMode = selectedLocation === null;

    useEffect(() => {
        fetchData();
    }, [activeTab, period, selectedLocation]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'command-center') {
                // Use new portfolio APIs
                const [kpisRes, alertsRes] = await Promise.all([
                    fetch(`/api/franchisor/portfolio/kpis?range=${period === 'mtd' ? 'MTD' : period === 'wtd' ? 'WTD' : 'TODAY'}`),
                    fetch('/api/franchisor/portfolio/alerts')
                ]);
                const [kpisData, alertsData] = await Promise.all([kpisRes.json(), alertsRes.json()]);
                setCommandCenter({
                    locations: kpisData.locations || { total: 0, active: 0, pending: 0, suspended: 0 },
                    appointments: kpisData.kpis?.appointments || { booked: 0, completed: 0, upcoming: 0, noShows: 0 },
                    walkIns: 0,
                    totalVisits: kpisData.kpis?.transactionCount || 0,
                    uniqueCustomers: kpisData.kpis?.uniqueCustomers || 0,
                    revenue: kpisData.kpis?.netSales || 0,
                    noShowRate: kpisData.kpis?.appointments?.booked > 0
                        ? (kpisData.kpis.appointments.noShows / kpisData.kpis.appointments.booked) * 100
                        : 0,
                    alerts: alertsData.alerts?.map((a: { message: string; type: string }) => ({ type: a.type, message: a.message })) || []
                });
            } else if (activeTab === 'leaderboard') {
                const res = await fetch(`/api/franchisor/portfolio/leaderboard?range=${period === 'mtd' ? 'MTD' : period === 'wtd' ? 'WTD' : 'TODAY'}&sortBy=netSales`);
                const data = await res.json();
                setLeaderboard(data.leaderboard?.map((l: { rank: number; id: string; name: string; netSales: number; transactionCount: number; avgTicket: number; noShowRate: number }) => ({
                    rank: l.rank,
                    id: l.id,
                    name: l.name,
                    revenue: l.netSales,
                    totalVisits: l.transactionCount,
                    uniqueCustomers: 0,
                    avgTicket: l.avgTicket,
                    noShowRate: l.noShowRate
                })) || []);
            } else if (activeTab === 'go-live') {
                const res = await fetch('/api/franchisor/reports/go-live-tracker');
                const data = await res.json();
                if (data.success) setGoLive(data.data);
            } else if (activeTab === 'retention') {
                const res = await fetch('/api/franchisor/reports/retention');
                const data = await res.json();
                if (data.success) setRetention(data.data);
            } else if (activeTab === 'stylists') {
                const res = await fetch('/api/franchisor/reports/stylists');
                const data = await res.json();
                if (data.success) setStylists(data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    }

    const tabs = [
        { id: 'command-center' as ReportTab, label: 'Command Center', icon: Activity },
        { id: 'leaderboard' as ReportTab, label: 'Leaderboard', icon: Trophy },
        { id: 'go-live' as ReportTab, label: 'Go-Live Tracker', icon: MapPin },
        { id: 'retention' as ReportTab, label: 'Retention', icon: Heart },
        { id: 'stylists' as ReportTab, label: 'Stylists', icon: Scissors },
    ];

    return (
        <div>
            {/* Header with Location Switcher - HIGH Z-INDEX for dropdown */}
            <div className="flex items-center justify-between mb-4 relative z-50">
                <div className="flex items-center gap-4">
                    <LocationSwitcher
                        selectedLocation={selectedLocation}
                        onLocationChange={setSelectedLocation}
                    />
                    {isNetworkMode ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)]/10 rounded-lg">
                            <Building2 size={14} className="text-[var(--primary)]" />
                            <span className="text-xs font-medium text-[var(--primary)]">Network View</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                            <MapPin size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">Single Location</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            // Generate PDF using browser print
                            const printContent = document.getElementById('report-content');
                            if (printContent) {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                    printWindow.document.write(`
                                        <html>
                                        <head>
                                            <title>ORO 9 - HQ Reports - ${new Date().toLocaleDateString()}</title>
                                            <style>
                                                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                                                h1 { color: #f97316; }
                                                .header { margin-bottom: 20px; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
                                                .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 8px; }
                                                .metric-label { font-size: 12px; color: #666; }
                                                .metric-value { font-size: 24px; font-weight: bold; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                                                th { background: #f97316; color: white; }
                                                .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="header">
                                                <h1>ORO 9 - Brand HQ Reports</h1>
                                                <p>Generated: ${new Date().toLocaleString()}</p>
                                                <p>Report Period: ${period === 'mtd' ? 'Month to Date' : period === 'wtd' ? 'Week to Date' : 'Today'}</p>
                                            </div>
                                            <h2>Command Center Summary</h2>
                                            <div class="metric">
                                                <div class="metric-label">Revenue</div>
                                                <div class="metric-value">$${(commandCenter?.revenue || 0).toLocaleString()}</div>
                                            </div>
                                            <div class="metric">
                                                <div class="metric-label">Total Visits</div>
                                                <div class="metric-value">${commandCenter?.totalVisits || 0}</div>
                                            </div>
                                            <div class="metric">
                                                <div class="metric-label">Unique Customers</div>
                                                <div class="metric-value">${commandCenter?.uniqueCustomers || 0}</div>
                                            </div>
                                            <div class="metric">
                                                <div class="metric-label">No-Show Rate</div>
                                                <div class="metric-value">${(commandCenter?.noShowRate || 0).toFixed(1)}%</div>
                                            </div>
                                            <div class="metric">
                                                <div class="metric-label">Active Locations</div>
                                                <div class="metric-value">${commandCenter?.locations?.active || 0}</div>
                                            </div>
                                            <div class="footer">
                                                ORO 9 POS System | Report Version 1.0 | Confidential
                                            </div>
                                        </body>
                                        </html>
                                    `);
                                    printWindow.document.close();
                                    printWindow.print();
                                }
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 text-white hover:bg-orange-400 rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        Export PDF
                    </button>
                    <button
                        onClick={() => fetchData()}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Single Location Health Header - Shows when location selected */}
            {selectedLocation && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-4 mb-6 relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedLocation.name}</h2>
                            <p className="text-sm text-[var(--text-muted)]">
                                {selectedLocation.city}{selectedLocation.state ? `, ${selectedLocation.state}` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <div className="text-lg font-bold text-emerald-400">$0</div>
                                <div className="text-xs text-[var(--text-muted)]">Today Sales</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-400">0</div>
                                <div className="text-xs text-[var(--text-muted)]">Appointments</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-purple-400">0</div>
                                <div className="text-xs text-[var(--text-muted)]">Walk-ins</div>
                            </div>
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">Active</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 relative z-10">
                {isNetworkMode ? 'Brand HQ Reports' : `${selectedLocation?.name} Reports`}
            </h1>

            {/* Tabs - LOWER Z-INDEX so dropdown overlays */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)] relative z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw size={32} className="animate-spin text-[var(--text-muted)]" />
                </div>
            ) : (
                <>
                    {/* COMMAND CENTER */}
                    {activeTab === 'command-center' && commandCenter && (
                        <div className="space-y-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard icon={MapPin} label="Locations Active" value={commandCenter.locations.active} subtext={`${commandCenter.locations.pending} pending`} color="emerald" />
                                <StatCard icon={Calendar} label="Appointments Today" value={commandCenter.appointments.completed} subtext={`${commandCenter.appointments.upcoming} upcoming`} color="blue" />
                                <StatCard icon={Users} label="Walk-ins Today" value={commandCenter.walkIns} subtext={`${commandCenter.uniqueCustomers} unique customers`} color="purple" />
                                <StatCard icon={DollarSign} label="Revenue Today" value={`$${commandCenter.revenue.toLocaleString()}`} subtext={`${commandCenter.totalVisits} total visits`} color="green" />
                            </div>

                            {/* Metrics Row */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="text-sm text-[var(--text-muted)] mb-1">No-Show Rate</div>
                                    <div className={`text-2xl font-bold ${commandCenter.noShowRate > 20 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                                        {commandCenter.noShowRate}%
                                    </div>
                                </div>
                                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="text-sm text-[var(--text-muted)] mb-1">Total Visits</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{commandCenter.totalVisits}</div>
                                </div>
                                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="text-sm text-[var(--text-muted)] mb-1">Unique Customers</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{commandCenter.uniqueCustomers}</div>
                                </div>
                            </div>

                            {/* Alerts */}
                            {commandCenter.alerts.length > 0 && (
                                <div className="glass-panel rounded-xl border border-orange-500/30 p-4 bg-orange-500/5">
                                    <h3 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                                        <AlertTriangle size={18} /> Action Required
                                    </h3>
                                    <ul className="space-y-2">
                                        {commandCenter.alerts.map((alert, i) => (
                                            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                                <XCircle size={14} className="text-orange-400" />
                                                {alert.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEADERBOARD */}
                    {activeTab === 'leaderboard' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <select
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm"
                                >
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="mtd">Month to Date</option>
                                </select>
                            </div>

                            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--surface-elevated)]">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-semibold">#</th>
                                            <th className="text-left py-3 px-4 font-semibold">Location</th>
                                            <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                                            <th className="text-right py-3 px-4 font-semibold">Visits</th>
                                            <th className="text-right py-3 px-4 font-semibold">Customers</th>
                                            <th className="text-right py-3 px-4 font-semibold">Avg Ticket</th>
                                            <th className="text-right py-3 px-4 font-semibold">No-Show %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((loc) => (
                                            <tr key={loc.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                                <td className="py-3 px-4">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${loc.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        loc.rank === 2 ? 'bg-stone-400/20 text-stone-300' :
                                                            loc.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-[var(--surface)] text-[var(--text-muted)]'
                                                        }`}>
                                                        {loc.rank}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-medium">{loc.name}</td>
                                                <td className="py-3 px-4 text-right text-emerald-400">${loc.revenue.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right">{loc.totalVisits}</td>
                                                <td className="py-3 px-4 text-right">{loc.uniqueCustomers}</td>
                                                <td className="py-3 px-4 text-right">${loc.avgTicket}</td>
                                                <td className={`py-3 px-4 text-right ${loc.noShowRate > 20 ? 'text-red-400' : ''}`}>{loc.noShowRate}%</td>
                                            </tr>
                                        ))}
                                        {leaderboard.length === 0 && (
                                            <tr><td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">No data available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* GO-LIVE TRACKER */}
                    {activeTab === 'go-live' && goLive && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-4 gap-4">
                                <StatCard icon={MapPin} label="Total Pending" value={goLive.summary.total} color="blue" />
                                <StatCard icon={Clock} label="Provisioning" value={goLive.summary.provisioningPending} color="amber" />
                                <StatCard icon={CheckCircle} label="Ready to Install" value={goLive.summary.readyForInstall} color="emerald" />
                                <StatCard icon={AlertTriangle} label="Stuck >7 Days" value={goLive.summary.stuckOver7Days} color="red" />
                            </div>

                            {/* Location List */}
                            <div className="glass-panel rounded-xl border border-[var(--border)]">
                                {goLive.locations.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                                        <p className="text-[var(--text-muted)]">All locations are live!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border)]">
                                        {goLive.locations.map((loc) => (
                                            <div key={loc.id} className="p-4 flex items-center justify-between hover:bg-[var(--surface-hover)]">
                                                <div>
                                                    <h4 className="font-medium text-[var(--text-primary)]">{loc.name}</h4>
                                                    <p className="text-sm text-[var(--text-muted)]">{loc.franchisee}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className={`text-sm font-medium ${loc.daysStuck > 7 ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                                                            {loc.daysStuck} days
                                                        </div>
                                                        <div className="text-xs text-[var(--text-muted)]">{loc.status}</div>
                                                    </div>
                                                    <div className="w-24 h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${loc.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${loc.progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-[var(--text-muted)]">{loc.progressPercent}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* RETENTION */}
                    {activeTab === 'retention' && retention && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard icon={Users} label="Total Customers" value={retention.summary.totalCustomers} color="blue" />
                                <StatCard icon={Users} label="This Month" value={retention.summary.thisMonthCustomers} subtext={`${retention.summary.newCustomers} new`} color="emerald" />
                                <StatCard icon={Heart} label="Returning" value={retention.summary.returningCustomers} color="purple" />
                                <StatCard icon={AlertTriangle} label="Lost (60+ days)" value={retention.summary.lostCustomers} color="red" />
                            </div>

                            {/* Repeat Rate Metrics */}
                            <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Repeat Rates</h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-emerald-400">{retention.metrics.repeatRate30}%</div>
                                        <div className="text-sm text-[var(--text-muted)]">30-Day Repeat</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-400">{retention.metrics.repeatRate60}%</div>
                                        <div className="text-sm text-[var(--text-muted)]">60-Day Repeat</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-purple-400">{retention.metrics.repeatRate90}%</div>
                                        <div className="text-sm text-[var(--text-muted)]">90-Day Repeat</div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="text-sm text-[var(--text-muted)] mb-1">Avg Visits per Customer</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{retention.metrics.avgVisitsPerCustomer}</div>
                                </div>
                                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="text-sm text-[var(--text-muted)] mb-1">Avg Spend per Customer</div>
                                    <div className="text-2xl font-bold text-emerald-400">${retention.metrics.avgSpendPerCustomer}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STYLISTS */}
                    {activeTab === 'stylists' && stylists && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-4 gap-4">
                                <StatCard icon={Scissors} label="Total Stylists" value={stylists.summary.totalStylists} color="purple" />
                                <StatCard icon={Clock} label="Avg Utilization" value={`${stylists.summary.avgUtilization}%`} color="blue" />
                                <StatCard icon={DollarSign} label="Total Revenue" value={`$${stylists.summary.totalRevenue.toLocaleString()}`} color="emerald" />
                                <StatCard icon={XCircle} label="Total No-Shows" value={stylists.summary.totalNoShows} color="red" />
                            </div>

                            {/* Stylist Table */}
                            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--surface-elevated)]">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-semibold">Stylist</th>
                                            <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                                            <th className="text-right py-3 px-4 font-semibold">Appointments</th>
                                            <th className="text-right py-3 px-4 font-semibold">Customers</th>
                                            <th className="text-right py-3 px-4 font-semibold">Utilization</th>
                                            <th className="text-right py-3 px-4 font-semibold">No-Show %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stylists.stylists.map((s: any, i: number) => (
                                            <tr key={s.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {i < 3 && <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            i === 1 ? 'bg-stone-400/20 text-stone-300' :
                                                                'bg-orange-500/20 text-orange-400'
                                                            }`}>{i + 1}</span>}
                                                        <span className="font-medium">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right text-emerald-400">${s.revenue.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right">{s.completed}</td>
                                                <td className="py-3 px-4 text-right">{s.uniqueCustomers}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={s.utilization < 50 ? 'text-amber-400' : ''}>{s.utilization}%</span>
                                                </td>
                                                <td className={`py-3 px-4 text-right ${s.noShowRate > 20 ? 'text-red-400' : ''}`}>{s.noShowRate}%</td>
                                            </tr>
                                        ))}
                                        {stylists.stylists.length === 0 && (
                                            <tr><td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">No stylist data available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
}) {
    const colorClasses: Record<string, string> = {
        emerald: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        green: 'bg-green-500/20 text-green-400',
        amber: 'bg-amber-500/20 text-amber-400',
        red: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color || 'blue']}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
            <div className="text-sm text-[var(--text-muted)]">{label}</div>
            {subtext && <div className="text-xs text-[var(--text-muted)] mt-1">{subtext}</div>}
        </div>
    );
}
