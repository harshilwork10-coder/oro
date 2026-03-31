'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, CheckCircle, Clock, DollarSign, MapPin,
    Filter, RefreshCw, ChevronRight, Shield, Activity,
    TrendingDown, Package, Users, Wifi, ArrowUp, Eye
} from 'lucide-react';

interface OwnerIssue {
    id: string;
    issueType: string;
    category: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: string;
    title: string;
    summary: string;
    priorityScore: number;
    financialImpact: any;
    ageHours: number;
    repeatCount: number;
    location: { id: string; name: string } | null;
    firstSeenAt: string;
    assignedToName: string | null;
}

const SEVERITY_CONFIG = {
    CRITICAL: { color: 'text-red-400 bg-red-500/15 border-red-500/30', icon: AlertTriangle, label: 'Critical' },
    HIGH: { color: 'text-orange-400 bg-orange-500/15 border-orange-500/30', icon: ArrowUp, label: 'High' },
    MEDIUM: { color: 'text-amber-400 bg-amber-500/15 border-amber-500/30', icon: Activity, label: 'Medium' },
    LOW: { color: 'text-blue-400 bg-blue-500/15 border-blue-500/30', icon: Eye, label: 'Low' },
};

const CATEGORY_ICONS: Record<string, any> = {
    CASH: DollarSign,
    EMPLOYEE: Users,
    INVENTORY: Package,
    SALES: TrendingDown,
    COMPLIANCE: Shield,
    OPERATIONS: Wifi,
};

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'text-red-400',
    ACKNOWLEDGED: 'text-amber-400',
    ASSIGNED: 'text-blue-400',
    SNOOZED: 'text-stone-500',
    ESCALATED: 'text-orange-400',
    RESOLVED: 'text-emerald-400',
    REOPENED: 'text-red-400',
};

export default function StoreHealthPage() {
    const [issues, setIssues] = useState<OwnerIssue[]>([]);
    const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('OPEN,ACKNOWLEDGED,ASSIGNED,ESCALATED,REOPENED');
    const [severityFilter, setSeverityFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [sortBy, setSortBy] = useState('priorityScore');

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (severityFilter) params.set('severity', severityFilter);
            if (locationFilter) params.set('locationId', locationFilter);
            params.set('sortBy', sortBy);
            params.set('limit', '100');

            const res = await fetch(`/api/owner/issues?${params}`);
            if (res.ok) {
                const data = await res.json();
                setIssues(data.issues || []);
                setTotal(data.total || 0);
                setLocations(data.locations || []);
            }
        } catch (err) {
            console.error('Failed to fetch issues:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, severityFilter, locationFilter, sortBy]);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    // Stats
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    const openCount = issues.filter(i => ['OPEN', 'REOPENED'].includes(i.status)).length;
    const totalFinancialImpact = issues.reduce((sum, i) => sum + (Number(i.financialImpact) || 0), 0);

    function formatAge(hours: number): string {
        if (hours < 1) return '<1h';
        if (hours < 24) return `${Math.round(hours)}h`;
        return `${Math.round(hours / 24)}d`;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Store Health</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Operational command center — issues, alerts, and store intelligence
                    </p>
                </div>
                <button
                    onClick={fetchIssues}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] rounded-lg text-[var(--text-secondary)] text-sm transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[var(--text-muted)] text-sm">Open Issues</span>
                        <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{openCount}</p>
                    <span className="text-xs text-[var(--text-muted)]">of {total} total</span>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[var(--text-muted)] text-sm">Critical</span>
                        <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {criticalCount}
                    </p>
                    <span className="text-xs text-[var(--text-muted)]">
                        {criticalCount === 0 ? 'All clear' : 'Needs attention'}
                    </span>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[var(--text-muted)] text-sm">High Priority</span>
                        <ArrowUp size={16} className="text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{highCount}</p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[var(--text-muted)] text-sm">$ Impact</span>
                        <DollarSign size={16} className="text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                        ${totalFinancialImpact.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-xs text-[var(--text-muted)]">estimated exposure</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm">
                    <Filter size={14} />
                    Filters:
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                    <option value="OPEN,ACKNOWLEDGED,ASSIGNED,ESCALATED,REOPENED">Active Issues</option>
                    <option value="OPEN,REOPENED">Open Only</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="">All</option>
                </select>
                <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                    <option value="">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
                <select
                    value={locationFilter}
                    onChange={e => setLocationFilter(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                    <option value="priorityScore">Priority Score</option>
                    <option value="newest">Newest First</option>
                    <option value="severity">Severity</option>
                </select>
            </div>

            {/* Issue List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                </div>
            ) : issues.length === 0 ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">All Clear</h2>
                    <p className="text-[var(--text-muted)] mt-2">
                        No issues match your current filters. Your stores are running smoothly.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {issues.map(issue => {
                        const sevConfig = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.LOW;
                        const SevIcon = sevConfig.icon;
                        const CatIcon = CATEGORY_ICONS[issue.category] || Activity;

                        return (
                            <div
                                key={issue.id}
                                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Severity Badge */}
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${sevConfig.color} shrink-0`}>
                                        <SevIcon size={18} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                                                {issue.title}
                                            </h3>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${sevConfig.color}`}>
                                                {sevConfig.label}
                                            </span>
                                            <span className={`text-xs font-medium ${STATUS_COLORS[issue.status] || 'text-stone-400'}`}>
                                                {issue.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">
                                            {issue.summary}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                                            {issue.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {issue.location.name}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <CatIcon size={12} />
                                                {issue.category}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatAge(issue.ageHours)} ago
                                            </span>
                                            {Number(issue.financialImpact) > 0 && (
                                                <span className="flex items-center gap-1 text-amber-400">
                                                    <DollarSign size={12} />
                                                    ${Number(issue.financialImpact).toFixed(0)}
                                                </span>
                                            )}
                                            {issue.repeatCount > 1 && (
                                                <span className="text-orange-400">
                                                    {issue.repeatCount}× recurring
                                                </span>
                                            )}
                                            {issue.assignedToName && (
                                                <span className="text-blue-400">
                                                    → {issue.assignedToName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Priority Score */}
                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-bold text-[var(--text-primary)]">
                                            {issue.priorityScore}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">score</div>
                                    </div>

                                    <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0 mt-3" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
