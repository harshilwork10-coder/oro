'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    User, Building2, Store, Search, MoreHorizontal, Filter,
    CheckCircle, Clock, XCircle, AlertTriangle, FileX, CreditCard,
    TrendingUp, Plus, RefreshCw, ChevronRight
} from 'lucide-react';

interface OwnerData {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    image: string | null;
    createdAt: string;
    llcCount: number;
    storeCount: number;
    primaryLlc: string | null;
    lastActivity?: string | null;
    memberships: {
        id: string;
        role: string;
        isPrimary: boolean;
        llcId: string;
        llcName: string;
        businessType: string;
        approvalStatus: string;
    }[];
}

// Quick filter options
const QUICK_FILTERS = [
    { id: 'all', label: 'All', icon: User, color: 'bg-stone-700 text-stone-300' },
    { id: 'active', label: 'Active', icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'issues', label: 'Issues', icon: XCircle, color: 'bg-red-500/20 text-red-400' },
    { id: 'noStores', label: 'No Stores', icon: Store, color: 'bg-amber-500/20 text-amber-400' },
    { id: 'newWeek', label: 'New This Week', icon: Plus, color: 'bg-blue-500/20 text-blue-400' },
    { id: 'highVolume', label: 'High Volume', icon: TrendingUp, color: 'bg-purple-500/20 text-purple-400' },
];

// Issue type definitions with explicit labels
const ISSUE_TYPES = {
    NO_STORE: { label: 'No Store', color: 'text-amber-400 bg-amber-500/20' },
    DOCS_MISSING: { label: 'Docs Missing', color: 'text-orange-400 bg-orange-500/20' },
    PAYMENT_DOWN: { label: 'Payment Down', color: 'text-red-400 bg-red-500/20' },
    SUSPENDED: { label: 'Suspended', color: 'text-red-400 bg-red-500/20' },
    PENDING_APPROVAL: { label: 'Pending', color: 'text-amber-400 bg-amber-500/20' },
};

export default function OwnersListPage() {
    const [owners, setOwners] = useState<OwnerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState('all');

    // Segmentation filters
    const [dealerFilter, setDealerFilter] = useState('ALL');
    const [stateFilter, setStateFilter] = useState('ALL');
    const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL');

    // Virtualization refs
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

    useEffect(() => {
        fetchOwners();
    }, []);

    async function fetchOwners() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/owners');
            if (res.ok) {
                const data = await res.json();
                setOwners(data);
            }
        } catch (error) {
            console.error('Failed to fetch owners:', error);
        } finally {
            setLoading(false);
        }
    }

    // Get explicit issue for owner
    const getIssue = useCallback((owner: OwnerData) => {
        if (owner.storeCount === 0) return ISSUE_TYPES.NO_STORE;
        const hasRejected = owner.memberships.some(m => m.approvalStatus === 'REJECTED');
        if (hasRejected) return ISSUE_TYPES.SUSPENDED;
        const hasPending = owner.memberships.some(m => m.approvalStatus === 'PENDING');
        if (hasPending) return ISSUE_TYPES.PENDING_APPROVAL;
        return null;
    }, []);

    // Filter owners
    const filteredOwners = useMemo(() => {
        let result = owners;

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.name?.toLowerCase().includes(q) ||
                o.email.toLowerCase().includes(q) ||
                o.phone?.toLowerCase().includes(q) ||
                o.primaryLlc?.toLowerCase().includes(q) ||
                o.memberships.some(m => m.llcName.toLowerCase().includes(q))
            );
        }

        // Quick filters
        if (quickFilter === 'active') {
            result = result.filter(o => !getIssue(o) || getIssue(o) === null);
        } else if (quickFilter === 'issues') {
            result = result.filter(o => getIssue(o) !== null);
        } else if (quickFilter === 'noStores') {
            result = result.filter(o => o.storeCount === 0);
        } else if (quickFilter === 'newWeek') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            result = result.filter(o => new Date(o.createdAt) > weekAgo);
        } else if (quickFilter === 'highVolume') {
            // Top 10% by store count
            const threshold = Math.ceil(result.length * 0.1);
            result = [...result].sort((a, b) => b.storeCount - a.storeCount).slice(0, threshold);
        }

        return result;
    }, [owners, searchQuery, quickFilter, getIssue]);

    // Format date
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };

    // Virtual scroll handler
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const scrollTop = containerRef.current.scrollTop;
        const rowHeight = 48;
        const start = Math.floor(scrollTop / rowHeight);
        const visibleCount = Math.ceil(containerRef.current.clientHeight / rowHeight);
        setVisibleRange({ start: Math.max(0, start - 5), end: start + visibleCount + 10 });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Owners</h1>
                    <p className="text-stone-500 text-sm">{filteredOwners.length} of {owners.length} owners</p>
                </div>
                <button onClick={fetchOwners} className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 text-sm">
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
                {QUICK_FILTERS.map(filter => {
                    const Icon = filter.icon;
                    const isActive = quickFilter === filter.id;
                    return (
                        <button
                            key={filter.id}
                            onClick={() => setQuickFilter(filter.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-orange-500 text-white' : filter.color + ' hover:bg-stone-700'
                                }`}
                        >
                            <Icon size={14} />
                            {filter.label}
                            {filter.id === 'issues' && (
                                <span className="ml-1 px-1.5 py-0.5 bg-red-500/30 rounded-full text-xs">
                                    {owners.filter(o => getIssue(o) !== null).length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search + Segmentation Row */}
            <div className="flex gap-3 items-center flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, email, phone, LLC, store..."
                        className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 text-sm"
                    />
                </div>

                {/* Segmentation */}
                <select value={dealerFilter} onChange={e => setDealerFilter(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200">
                    <option value="ALL">All Dealers</option>
                    {/* TODO: Populate from API */}
                </select>
                <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200">
                    <option value="ALL">All States</option>
                    {/* TODO: Populate from API */}
                </select>
                <select value={businessTypeFilter} onChange={e => setBusinessTypeFilter(e.target.value)} className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200">
                    <option value="ALL">All Types</option>
                    <option value="SALON">Salon</option>
                    <option value="RETAIL">Retail</option>
                    <option value="RESTAURANT">Restaurant</option>
                </select>
            </div>

            {/* Virtualized Table */}
            <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-800/50 text-stone-400 text-xs font-medium uppercase tracking-wide">
                    <div className="col-span-3">Owner</div>
                    <div className="col-span-2">Primary Business</div>
                    <div className="col-span-1 text-center"># Biz</div>
                    <div className="col-span-1 text-center"># Stores</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Joined</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Table Body (Virtualized) */}
                <div
                    ref={containerRef}
                    className="overflow-auto max-h-[calc(100vh-320px)]"
                    onScroll={handleScroll}
                >
                    {filteredOwners.length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            No owners match your filters
                        </div>
                    ) : (
                        <div style={{ height: filteredOwners.length * 48 + 'px', position: 'relative' }}>
                            {filteredOwners.slice(visibleRange.start, visibleRange.end).map((owner, idx) => {
                                const issue = getIssue(owner);
                                const actualIdx = visibleRange.start + idx;
                                return (
                                    <Link
                                        key={owner.id}
                                        href={`/provider/owners/${owner.id}`}
                                        className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-stone-800/50 items-center border-b border-stone-800/50 absolute w-full"
                                        style={{ top: actualIdx * 48 + 'px', height: '48px' }}
                                    >
                                        {/* Owner */}
                                        <div className="col-span-3 flex items-center gap-3">
                                            <div className="h-8 w-8 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                                                {owner.image ? (
                                                    <img src={owner.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                                                ) : (
                                                    <User className="h-4 w-4 text-amber-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-stone-100 text-sm font-medium truncate">
                                                    {owner.name || 'Unnamed'}
                                                </div>
                                                <div className="text-stone-500 text-xs truncate">
                                                    {owner.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Primary Business */}
                                        <div className="col-span-2 text-stone-300 text-sm truncate">
                                            {owner.primaryLlc || '-'}
                                        </div>

                                        {/* # Businesses */}
                                        <div className="col-span-1 text-center">
                                            <span className="inline-flex items-center gap-1 text-blue-400 text-sm font-medium">
                                                <Building2 size={12} />
                                                {owner.llcCount}
                                            </span>
                                        </div>

                                        {/* # Stores */}
                                        <div className="col-span-1 text-center">
                                            <span className={`inline-flex items-center gap-1 text-sm font-medium ${owner.storeCount === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                <Store size={12} />
                                                {owner.storeCount}
                                            </span>
                                        </div>

                                        {/* Status - Explicit Labels */}
                                        <div className="col-span-2">
                                            {issue ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${issue.color}`}>
                                                    <AlertTriangle size={10} />
                                                    {issue.label}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-emerald-400 bg-emerald-500/20">
                                                    <CheckCircle size={10} />
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Joined */}
                                        <div className="col-span-2 text-stone-500 text-xs">
                                            {formatDate(owner.createdAt)}
                                        </div>

                                        {/* Arrow */}
                                        <div className="col-span-1 flex justify-end">
                                            <ChevronRight size={16} className="text-stone-600" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex gap-4 text-xs text-stone-500">
                <span>Total: {owners.length}</span>
                <span>•</span>
                <span>Active: {owners.filter(o => !getIssue(o)).length}</span>
                <span>•</span>
                <span>Issues: {owners.filter(o => getIssue(o) !== null).length}</span>
                <span>•</span>
                <span>No Stores: {owners.filter(o => o.storeCount === 0).length}</span>
            </div>
        </div>
    );
}
