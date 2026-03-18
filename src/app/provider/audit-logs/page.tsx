'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Download, X, ChevronRight, ChevronDown,
    DollarSign, CreditCard, UserCheck, Clock, Shield,
    AlertTriangle, Receipt, Package, Users, Settings,
    Building2, MapPin, Store, Bookmark, Filter, Eye, Bell, BellOff
} from 'lucide-react';

interface AuditLog {
    id: string;
    userId: string;
    userEmail: string;
    userRole: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: any;
    status: string;
    storeName: string | null;
    createdAt: string;
}

interface FilterOption {
    id: string;
    name: string;
}

// Action type configs
const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string; flagged: boolean }> = {
    SALE_COMPLETED: { icon: DollarSign, color: 'text-green-400 bg-green-500/20', label: 'Sale', flagged: false },
    REFUND_PROCESSED: { icon: Receipt, color: 'text-yellow-400 bg-yellow-500/20', label: 'Refund', flagged: true },
    VOID_TRANSACTION: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/20', label: 'Void', flagged: true },
    CASH_DRAWER_OPEN: { icon: DollarSign, color: 'text-blue-400 bg-blue-500/20', label: 'Drawer Open', flagged: true },
    CLOCK_IN: { icon: Clock, color: 'text-green-400 bg-green-500/20', label: 'Clock In', flagged: false },
    CLOCK_OUT: { icon: Clock, color: 'text-orange-400 bg-orange-500/20', label: 'Clock Out', flagged: false },
    SHIFT_STARTED: { icon: UserCheck, color: 'text-green-400 bg-green-500/20', label: 'Shift Start', flagged: false },
    SHIFT_ENDED: { icon: UserCheck, color: 'text-orange-400 bg-orange-500/20', label: 'Shift End', flagged: false },
    PIN_LOGIN: { icon: Shield, color: 'text-blue-400 bg-blue-500/20', label: 'PIN Login', flagged: false },
    LOGIN: { icon: Shield, color: 'text-blue-400 bg-blue-500/20', label: 'Login', flagged: false },
    DISCOUNT_APPLIED: { icon: DollarSign, color: 'text-purple-400 bg-purple-500/20', label: 'Discount', flagged: true },
    PRICE_OVERRIDE: { icon: DollarSign, color: 'text-red-400 bg-red-500/20', label: 'Price Override', flagged: true },
    PERMISSIONS_CHANGED: { icon: Shield, color: 'text-yellow-400 bg-yellow-500/20', label: 'Permissions', flagged: true },
    SETTINGS_UPDATED: { icon: Settings, color: 'text-blue-400 bg-blue-500/20', label: 'Settings', flagged: true },
};

// Quick action filters
const QUICK_ACTIONS = [
    { id: 'SALE_COMPLETED', label: 'Sales', icon: DollarSign, color: 'bg-green-500/20 text-green-400 border-green-500/50' },
    { id: 'REFUND_PROCESSED', label: 'Refunds', icon: Receipt, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
    { id: 'VOID_TRANSACTION', label: 'Voids', icon: AlertTriangle, color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    { id: 'LOGIN', label: 'Logins', icon: Shield, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    { id: 'DISCOUNT_APPLIED', label: 'Discounts', icon: DollarSign, color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
    { id: 'PRICE_OVERRIDE', label: 'Price Override', icon: DollarSign, color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    { id: 'CASH_DRAWER_OPEN', label: 'Drawer Opens', icon: DollarSign, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    { id: 'PERMISSIONS_CHANGED', label: 'Permissions', icon: Shield, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
];

// Scope options
const SCOPES = [
    { id: 'my', label: 'My Stores', icon: Store },
    { id: 'dealer', label: 'By Dealer', icon: Users },
    { id: 'brand', label: 'By Brand', icon: Building2 },
    { id: 'region', label: 'By Region', icon: MapPin },
    { id: 'all', label: 'All', icon: Eye },
];

// Format raw JSON details into human-readable text
function formatDetails(log: AuditLog): string {
    const c = log.changes;
    if (!c) return '—';

    try {
        if (log.action === 'SALE_COMPLETED') {
            const inv = c.invoiceNumber || c.invoice_number || '';
            const total = c.total ? `$${Number(c.total).toFixed(2)}` : '';
            return [inv && `Invoice ${inv}`, total].filter(Boolean).join(' · ') || 'Sale completed';
        }
        if (log.action === 'REFUND_PROCESSED') {
            const origTx = c.originalTransactionId || c.invoiceNumber || '';
            const amt = c.amount || c.total ? `$${Number(c.amount || c.total).toFixed(2)}` : '';
            return [origTx && `Refund on ${origTx}`, amt].filter(Boolean).join(' · ') || 'Refund processed';
        }
        if (log.action === 'VOID_TRANSACTION') {
            const inv = c.invoiceNumber || c.transactionId || '';
            const reason = c.reason || '';
            return [inv && `Voided ${inv}`, reason].filter(Boolean).join(' — ') || 'Transaction voided';
        }
        if (log.action === 'PRICE_OVERRIDE') {
            const old = c.oldPrice ? `$${Number(c.oldPrice).toFixed(2)}` : '';
            const nw = c.newPrice ? `$${Number(c.newPrice).toFixed(2)}` : '';
            const item = c.itemName || c.productName || '';
            return [item, old && nw ? `${old} → ${nw}` : ''].filter(Boolean).join(': ') || 'Price overridden';
        }
        if (log.action === 'DISCOUNT_APPLIED') {
            const pct = c.discountPercent || c.percent;
            const amt = c.discountAmount || c.amount;
            return pct ? `${pct}% discount applied` : amt ? `$${Number(amt).toFixed(2)} discount` : 'Discount applied';
        }
        if (log.action === 'PERMISSIONS_CHANGED') {
            const old = c.oldValues || c.oldRole || '';
            const nw = c.newValues || c.newRole || '';
            return old && nw ? `Changed: ${JSON.stringify(old)} → ${JSON.stringify(nw)}` : 'Permissions updated';
        }
        if (log.action === 'SETTINGS_UPDATED') {
            const old = c.oldValues;
            return old ? `Settings changed` : 'Settings updated';
        }
        if (log.action === 'CASH_DRAWER_OPEN') {
            return c.reason || 'Cash drawer opened';
        }
        if (log.action === 'LOGIN' || log.action === 'PIN_LOGIN') {
            return c.device || c.stationName || 'Login';
        }
        // Fallback: show a compact version of changes
        const keys = Object.keys(c).slice(0, 3);
        return keys.map(k => `${k}: ${typeof c[k] === 'string' ? c[k].slice(0, 20) : c[k]}`).join(', ');
    } catch {
        return '—';
    }
}

// Group logs by date
function groupByDay(logs: AuditLog[]): { date: string; label: string; logs: AuditLog[] }[] {
    const groups: Record<string, AuditLog[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    logs.forEach(log => {
        const d = new Date(log.createdAt).toDateString();
        if (!groups[d]) groups[d] = [];
        groups[d].push(log);
    });

    return Object.entries(groups).map(([dateStr, dayLogs]) => ({
        date: dateStr,
        label: dateStr === today ? 'Today' : dateStr === yesterday ? 'Yesterday' : new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        logs: dayLogs
    }));
}

// Count flagged items in a day
function dayFlagSummary(logs: AuditLog[]) {
    const refunds = logs.filter(l => l.action === 'REFUND_PROCESSED').length;
    const voids = logs.filter(l => l.action === 'VOID_TRANSACTION').length;
    const overrides = logs.filter(l => l.action === 'PRICE_OVERRIDE').length;
    const discounts = logs.filter(l => l.action === 'DISCOUNT_APPLIED').length;
    const drawer = logs.filter(l => l.action === 'CASH_DRAWER_OPEN').length;
    const perms = logs.filter(l => l.action === 'PERMISSIONS_CHANGED' || l.action === 'SETTINGS_UPDATED').length;
    const parts: string[] = [];
    if (refunds) parts.push(`${refunds} refund${refunds > 1 ? 's' : ''}`);
    if (voids) parts.push(`${voids} void${voids > 1 ? 's' : ''}`);
    if (overrides) parts.push(`${overrides} override${overrides > 1 ? 's' : ''}`);
    if (discounts) parts.push(`${discounts} discount${discounts > 1 ? 's' : ''}`);
    if (drawer) parts.push(`${drawer} drawer open${drawer > 1 ? 's' : ''}`);
    if (perms) parts.push(`${perms} setting change${perms > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : 'No flagged events';
}

export default function AuditLogsPage() {
    // State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // View mode: flagged (default) vs all
    const [viewMode, setViewMode] = useState<'flagged' | 'all'>('flagged');
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

    // Scope & Filters
    const [scope, setScope] = useState('my');
    const [selectedActions, setSelectedActions] = useState<string[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Group filters
    const [dealers, setDealers] = useState<FilterOption[]>([]);
    const [selectedDealer, setSelectedDealer] = useState('ALL');
    const [states, setStates] = useState<FilterOption[]>([]);
    const [selectedState, setSelectedState] = useState('ALL');
    const [statuses] = useState(['ACTIVE', 'PENDING', 'SUSPENDED']);
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Store search
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeSearchResults, setStoreSearchResults] = useState<FilterOption[]>([]);
    const [selectedStores, setSelectedStores] = useState<FilterOption[]>([]);
    const [showStoreSearch, setShowStoreSearch] = useState(false);

    // Investigate drawer
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showInvestigateDrawer, setShowInvestigateDrawer] = useState(false);

    // Saved views
    const [savedViews] = useState([
        { name: 'Refunds Last 7d', filters: { actions: ['REFUND_PROCESSED'], days: 7 } },
        { name: 'After-hours Voids', filters: { actions: ['VOID_TRANSACTION'], afterHours: true } },
    ]);

    // Compute displayed logs
    const displayedLogs = (() => {
        let filtered = logs;
        // If viewMode is 'flagged' and no explicit action filters are set, show only flagged
        if (viewMode === 'flagged' && selectedActions.length === 0) {
            filtered = filtered.filter(l => {
                const config = ACTION_CONFIG[l.action];
                return config ? config.flagged : true; // Unknown actions are shown (could be important)
            });
        }
        return filtered;
    })();

    const dayGroups = groupByDay(displayedLogs);
    const flaggedCount = logs.filter(l => ACTION_CONFIG[l.action]?.flagged).length;

    // Fetch group filter options
    const fetchFilters = async () => {
        try {
            const dealerRes = await fetch('/api/provider/dealers');
            if (dealerRes.ok) {
                const data = await dealerRes.json();
                setDealers(data.dealers || []);
            }
            const franchiseRes = await fetch('/api/admin/franchises');
            if (franchiseRes.ok) {
                const data = await franchiseRes.json();
                const uniqueStates = [...new Set((data.franchises || [])
                    .map((f: any) => f.state)
                    .filter(Boolean))] as string[];
                setStates(uniqueStates.map(s => ({ id: s, name: s })));
            }
        } catch (error) {
            console.log('Failed to fetch filters:', error);
        }
    };

    // Fetch audit logs
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedActions.length === 1) params.append('action', selectedActions[0]);
            if (selectedDealer !== 'ALL') params.append('dealerId', selectedDealer);
            if (selectedState !== 'ALL') params.append('state', selectedState);
            if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
            if (selectedStores.length > 0) params.append('storeIds', selectedStores.map(s => s.id).join(','));
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            params.append('limit', '200');

            const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                let logsData = data.logs || data || [];
                if (selectedActions.length > 1) {
                    logsData = logsData.filter((log: AuditLog) => selectedActions.includes(log.action));
                }
                setLogs(logsData);
            }
        } catch (error) {
            console.log('Failed to fetch audit logs:', error);
        }
        setLoading(false);
    };

    // Store search
    const searchStores = useCallback(async (query: string) => {
        if (query.length < 2) { setStoreSearchResults([]); return; }
        try {
            const res = await fetch(`/api/admin/franchises?search=${encodeURIComponent(query)}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setStoreSearchResults((data.franchises || []).map((f: any) => ({
                    id: f.id, name: `${f.name} — ${f.city || ''}, ${f.state || ''}`
                })));
            }
        } catch (error) { console.log('Store search error:', error); }
    }, []);

    const toggleAction = (actionId: string) => {
        setSelectedActions(prev => prev.includes(actionId) ? prev.filter(a => a !== actionId) : [...prev, actionId]);
    };

    const addStore = (store: FilterOption) => {
        if (!selectedStores.find(s => s.id === store.id)) setSelectedStores([...selectedStores, store]);
        setStoreSearchQuery(''); setStoreSearchResults([]); setShowStoreSearch(false);
    };

    const removeStore = (storeId: string) => setSelectedStores(selectedStores.filter(s => s.id !== storeId));

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const getActionConfig = (action: string) => {
        return ACTION_CONFIG[action] || { icon: Receipt, color: 'text-stone-400 bg-stone-500/20', label: action, flagged: true };
    };

    const openInvestigate = (log: AuditLog) => { setSelectedLog(log); setShowInvestigateDrawer(true); };

    const toggleDay = (date: string) => {
        setCollapsedDays(prev => {
            const next = new Set(prev);
            next.has(date) ? next.delete(date) : next.add(date);
            return next;
        });
    };

    // Effects
    useEffect(() => { fetchFilters(); }, []);
    useEffect(() => { fetchLogs(); }, [selectedActions, selectedDealer, selectedState, selectedStatus, selectedStores, dateFrom, dateTo]);
    useEffect(() => {
        const timer = setTimeout(() => searchStores(storeSearchQuery), 300);
        return () => clearTimeout(timer);
    }, [storeSearchQuery, searchStores]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Audit Logs</h1>
                    <p className="text-stone-500 text-sm">Enterprise audit trail • Web & Android POS</p>
                </div>
                <div className="flex gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex bg-stone-800 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('flagged')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'flagged' ? 'bg-red-500/20 text-red-400' : 'text-stone-400 hover:text-stone-200'}`}
                        >
                            <Bell size={14} />
                            Flagged Only
                            {flaggedCount > 0 && <span className="px-1.5 py-0.5 bg-red-500/30 text-red-400 rounded text-xs">{flaggedCount}</span>}
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'all' ? 'bg-stone-700 text-stone-200' : 'text-stone-400 hover:text-stone-200'}`}
                        >
                            <Eye size={14} />
                            All Events
                        </button>
                    </div>
                    <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 text-sm">
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm">
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Scope Pills */}
            <div className="flex gap-2">
                {SCOPES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setScope(s.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${scope === s.id ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
                    >
                        <s.icon size={14} />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="bg-stone-900 rounded-lg border border-stone-800 p-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">Dealer:</span>
                        <select value={selectedDealer} onChange={(e) => setSelectedDealer(e.target.value)} className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200">
                            <option value="ALL">All</option>
                            {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">State:</span>
                        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200">
                            <option value="ALL">All</option>
                            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">Status:</span>
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200">
                            <option value="ALL">All</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200" />
                        <span className="text-stone-500">→</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200" />
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-stone-500 text-xs">Stores:</span>
                    {selectedStores.map(store => (
                        <span key={store.id} className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                            {store.name.split(' — ')[0]}
                            <button onClick={() => removeStore(store.id)} className="hover:text-orange-200"><X size={12} /></button>
                        </span>
                    ))}
                    <div className="relative">
                        <button onClick={() => setShowStoreSearch(!showStoreSearch)} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs text-stone-400">+ Add store</button>
                        {showStoreSearch && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50">
                                <input type="text" placeholder="Search by name, city..." value={storeSearchQuery} onChange={(e) => setStoreSearchQuery(e.target.value)} className="w-full px-3 py-2 bg-transparent border-b border-stone-700 text-sm text-stone-200 placeholder-stone-500" autoFocus />
                                <div className="max-h-48 overflow-auto">
                                    {storeSearchResults.map(store => (
                                        <button key={store.id} onClick={() => addStore(store)} className="w-full px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-700">{store.name}</button>
                                    ))}
                                    {storeSearchQuery.length >= 2 && storeSearchResults.length === 0 && <p className="px-3 py-2 text-stone-500 text-sm">No stores found</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 flex-wrap">
                {QUICK_ACTIONS.map(action => {
                    const isActive = selectedActions.includes(action.id);
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.id}
                            onClick={() => toggleAction(action.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isActive ? action.color + ' border-current' : 'bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500'}`}
                        >
                            <Icon size={14} />
                            {action.label}
                        </button>
                    );
                })}
                {selectedActions.length > 0 && (
                    <button onClick={() => setSelectedActions([])} className="px-3 py-1.5 text-stone-500 hover:text-stone-300 text-sm">Clear</button>
                )}
            </div>

            {/* Saved Views */}
            <div className="flex items-center gap-2">
                <Bookmark size={14} className="text-stone-500" />
                <span className="text-stone-500 text-xs">Saved:</span>
                {savedViews.map((view, i) => (
                    <button key={i} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs text-stone-400">{view.name}</button>
                ))}
                <button className="px-2 py-1 text-orange-400 hover:text-orange-300 text-xs">+ Save current</button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                <input
                    type="text" placeholder="Search employee, invoice, device ID..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg py-2 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500"
                />
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-6 gap-2">
                {[
                    { label: 'Total', value: logs.length, color: 'text-blue-400' },
                    { label: 'Sales', value: logs.filter(l => l.action === 'SALE_COMPLETED').length, color: 'text-green-400' },
                    { label: 'Refunds', value: logs.filter(l => l.action === 'REFUND_PROCESSED').length, color: 'text-yellow-400' },
                    { label: 'Voids', value: logs.filter(l => l.action === 'VOID_TRANSACTION').length, color: 'text-red-400' },
                    { label: 'Clock', value: logs.filter(l => l.action?.includes('CLOCK') || l.action?.includes('SHIFT')).length, color: 'text-purple-400' },
                    { label: 'Logins', value: logs.filter(l => l.action?.includes('LOGIN')).length, color: 'text-blue-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-stone-900 rounded border border-stone-800 p-2 text-center">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-stone-500 text-xs">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Flagged-Only Info Banner */}
            {viewMode === 'flagged' && selectedActions.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <Bell size={16} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm">
                        Showing <strong>{displayedLogs.length}</strong> flagged events (refunds, voids, overrides, drawer opens, permission changes).
                        <button onClick={() => setViewMode('all')} className="ml-2 text-stone-400 hover:text-stone-200 underline">Show all {logs.length} events</button>
                    </p>
                </div>
            )}

            {/* Grouped Logs by Day */}
            {loading ? (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    <RefreshCw size={32} className="mx-auto text-stone-600 mb-4 animate-spin" />
                    <p className="text-stone-400">Loading audit logs...</p>
                </div>
            ) : displayedLogs.length === 0 ? (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    {viewMode === 'flagged' ? (
                        <>
                            <Bell size={48} className="mx-auto text-emerald-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">All Clear</h2>
                            <p className="text-stone-400 mt-2">No flagged events found. Everything looks normal.</p>
                            <button onClick={() => setViewMode('all')} className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm text-stone-300">View All Events</button>
                        </>
                    ) : (
                        <>
                            <Receipt size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No logs found</h2>
                            <p className="text-stone-400 mt-2">Try adjusting your filters or date range</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {dayGroups.map(group => {
                        const isCollapsed = collapsedDays.has(group.date);
                        const flagSummary = dayFlagSummary(group.logs);
                        return (
                            <div key={group.date} className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                                {/* Day Header */}
                                <button
                                    onClick={() => toggleDay(group.date)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isCollapsed ? <ChevronRight size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
                                        <span className="text-stone-100 font-semibold text-sm">{group.label}</span>
                                        <span className="text-stone-500 text-xs">{group.logs.length} event{group.logs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <span className="text-stone-400 text-xs">{flagSummary}</span>
                                </button>

                                {/* Day Logs */}
                                {!isCollapsed && (
                                    <div className="border-t border-stone-800/50">
                                        <table className="w-full">
                                            <tbody className="divide-y divide-stone-800/30">
                                                {group.logs.map(log => {
                                                    const config = getActionConfig(log.action);
                                                    const Icon = config.icon;
                                                    return (
                                                        <tr key={log.id} className="hover:bg-stone-800/30 cursor-pointer transition-colors" onClick={() => openInvestigate(log)}>
                                                            <td className="pl-4 pr-2 py-2.5 text-stone-500 text-xs w-20 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                                                            <td className="px-2 py-2.5 w-32">
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                                                    <Icon size={12} />
                                                                    {config.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-2.5 text-stone-300 text-xs w-28">{log.userEmail?.split('@')[0] || 'Unknown'}</td>
                                                            <td className="px-2 py-2.5 text-orange-400 text-xs w-36 truncate">{log.storeName || <span className="text-stone-600">—</span>}</td>
                                                            <td className="px-2 py-2.5 text-stone-200 text-xs">{formatDetails(log)}</td>
                                                            <td className="px-2 py-2.5 w-8"><ChevronRight size={14} className="text-stone-600" /></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Investigate Drawer */}
            {showInvestigateDrawer && selectedLog && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowInvestigateDrawer(false)} />
                    <div className="fixed right-0 top-0 h-full w-96 bg-stone-900 border-l border-stone-800 z-50 overflow-auto">
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-stone-100">Investigate</h2>
                            <button onClick={() => setShowInvestigateDrawer(false)} className="text-stone-400 hover:text-stone-200"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-3">
                                {[
                                    { label: 'Action', value: getActionConfig(selectedLog.action).label },
                                    { label: 'Time', value: new Date(selectedLog.createdAt).toLocaleString() },
                                    { label: 'Employee', value: selectedLog.userEmail },
                                    { label: 'Role', value: selectedLog.userRole },
                                    { label: 'Entity', value: `${selectedLog.entityType}: ${selectedLog.entityId}` },
                                    { label: 'Summary', value: formatDetails(selectedLog) },
                                ].map(item => (
                                    <div key={item.label}>
                                        <p className="text-stone-500 text-xs">{item.label}</p>
                                        <p className="text-stone-200 text-sm">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-stone-800 pt-4 space-y-2">
                                <p className="text-stone-400 text-xs font-medium">Quick Actions</p>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">Show all by this employee (24h)</button>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">Show all at this store (today)</button>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">View transaction</button>
                            </div>
                            <div className="border-t border-stone-800 pt-4">
                                <p className="text-stone-400 text-xs font-medium mb-2">Full Details</p>
                                <pre className="bg-stone-800 rounded p-3 text-stone-300 text-xs overflow-auto max-h-64">
                                    {JSON.stringify(selectedLog.changes, null, 2)}
                                </pre>
                            </div>
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm">
                                <Download size={14} />
                                Export Investigation
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
