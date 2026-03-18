'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Download, X, ChevronRight, ChevronDown,
    DollarSign, CreditCard, UserCheck, Clock, Shield,
    AlertTriangle, Receipt, Package, Users, Settings,
    Building2, MapPin, Store, Bookmark, Filter, Eye, Bell, ArrowLeft
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
const ACTION_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string; flagged: boolean }> = {
    SALE_COMPLETED: { icon: DollarSign, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Sales', flagged: false },
    REFUND_PROCESSED: { icon: Receipt, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Refunds', flagged: true },
    VOID_TRANSACTION: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Voids', flagged: true },
    CASH_DRAWER_OPEN: { icon: DollarSign, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Drawer Opens', flagged: true },
    CLOCK_IN: { icon: Clock, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Clock In', flagged: false },
    CLOCK_OUT: { icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Clock Out', flagged: false },
    SHIFT_STARTED: { icon: UserCheck, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Shift Start', flagged: false },
    SHIFT_ENDED: { icon: UserCheck, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Shift End', flagged: false },
    PIN_LOGIN: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'PIN Login', flagged: false },
    LOGIN: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Logins', flagged: false },
    DISCOUNT_APPLIED: { icon: DollarSign, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Discounts', flagged: true },
    PRICE_OVERRIDE: { icon: DollarSign, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Price Overrides', flagged: true },
    PERMISSIONS_CHANGED: { icon: Shield, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Permission Changes', flagged: true },
    SETTINGS_UPDATED: { icon: Settings, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Settings Updates', flagged: true },
};

// Scope options
const SCOPES = [
    { id: 'my', label: 'My Stores', icon: Store },
    { id: 'dealer', label: 'By Dealer', icon: Users },
    { id: 'brand', label: 'By Brand', icon: Building2 },
    { id: 'region', label: 'By Region', icon: MapPin },
    { id: 'all', label: 'All', icon: Eye },
];

// Define the order: flagged actions first, then routine
const FLAGGED_ACTIONS = ['REFUND_PROCESSED', 'VOID_TRANSACTION', 'PRICE_OVERRIDE', 'DISCOUNT_APPLIED', 'CASH_DRAWER_OPEN', 'PERMISSIONS_CHANGED', 'SETTINGS_UPDATED'];
const ROUTINE_ACTIONS = ['SALE_COMPLETED', 'LOGIN', 'PIN_LOGIN', 'CLOCK_IN', 'CLOCK_OUT', 'SHIFT_STARTED', 'SHIFT_ENDED'];

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
            return c.oldValues ? 'Settings changed' : 'Settings updated';
        }
        if (log.action === 'CASH_DRAWER_OPEN') {
            return c.reason || 'Cash drawer opened';
        }
        if (log.action === 'LOGIN' || log.action === 'PIN_LOGIN') {
            return c.device || c.stationName || 'Login';
        }
        const keys = Object.keys(c).slice(0, 3);
        return keys.map(k => `${k}: ${typeof c[k] === 'string' ? c[k].slice(0, 20) : c[k]}`).join(', ');
    } catch {
        return '—';
    }
}

export default function AuditLogsPage() {
    // State
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [summaryLoading, setSummaryLoading] = useState(true);

    // Drill-down state
    const [drillAction, setDrillAction] = useState<string | null>(null); // Currently viewing this action's logs
    const [drillLogs, setDrillLogs] = useState<AuditLog[]>([]);
    const [drillLoading, setDrillLoading] = useState(false);

    // Scope & Filters
    const [scope, setScope] = useState('my');
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

    // Search for drill-down
    const [searchQuery, setSearchQuery] = useState('');

    // Build query params for API calls
    const buildParams = useCallback((extra: Record<string, string> = {}) => {
        const params = new URLSearchParams();
        if (selectedDealer !== 'ALL') params.append('dealerId', selectedDealer);
        if (selectedState !== 'ALL') params.append('state', selectedState);
        if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
        if (selectedStores.length > 0) params.append('storeIds', selectedStores.map(s => s.id).join(','));
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        Object.entries(extra).forEach(([k, v]) => params.append(k, v));
        return params.toString();
    }, [selectedDealer, selectedState, selectedStatus, selectedStores, dateFrom, dateTo]);

    // Fetch only summary counts (lightweight)
    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const qs = buildParams({ mode: 'summary' });
            const res = await fetch(`/api/admin/audit-logs?${qs}`);
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary || {});
                setSummaryTotal(data.total || 0);
            }
        } catch (error) {
            console.log('Failed to fetch summary:', error);
        }
        setSummaryLoading(false);
    }, [buildParams]);

    // Fetch detailed logs for a specific action (drill-down)
    const fetchDrillDown = useCallback(async (action: string) => {
        setDrillLoading(true);
        setDrillAction(action);
        try {
            const qs = buildParams({ action, limit: '100' });
            const res = await fetch(`/api/admin/audit-logs?${qs}`);
            if (res.ok) {
                const data = await res.json();
                setDrillLogs(data.logs || []);
            }
        } catch (error) {
            console.log('Failed to fetch logs:', error);
        }
        setDrillLoading(false);
    }, [buildParams]);

    // Search by keyword
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setDrillLoading(true);
        setDrillAction('SEARCH');
        try {
            const qs = buildParams({ search: searchQuery, limit: '100' });
            const res = await fetch(`/api/admin/audit-logs?${qs}`);
            if (res.ok) {
                const data = await res.json();
                setDrillLogs(data.logs || []);
            }
        } catch (error) {
            console.log('Failed to search logs:', error);
        }
        setDrillLoading(false);
    }, [buildParams, searchQuery]);

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

    const addStore = (store: FilterOption) => {
        if (!selectedStores.find(s => s.id === store.id)) setSelectedStores([...selectedStores, store]);
        setStoreSearchQuery(''); setStoreSearchResults([]); setShowStoreSearch(false);
    };
    const removeStore = (storeId: string) => setSelectedStores(selectedStores.filter(s => s.id !== storeId));

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    const getActionConfig = (action: string) => {
        return ACTION_CONFIG[action] || { icon: Receipt, color: 'text-stone-400', bgColor: 'bg-stone-500/20', label: action, flagged: true };
    };

    const openInvestigate = (log: AuditLog) => { setSelectedLog(log); setShowInvestigateDrawer(true); };

    const goBack = () => { setDrillAction(null); setDrillLogs([]); setSearchQuery(''); };

    // Effects
    useEffect(() => { fetchFilters(); }, []);
    useEffect(() => { fetchSummary(); setDrillAction(null); setDrillLogs([]); }, [fetchSummary]);
    useEffect(() => {
        const timer = setTimeout(() => searchStores(storeSearchQuery), 300);
        return () => clearTimeout(timer);
    }, [storeSearchQuery, searchStores]);

    // Compute flag counts
    const flaggedTotal = FLAGGED_ACTIONS.reduce((sum, a) => sum + (summary[a] || 0), 0);
    const routineTotal = ROUTINE_ACTIONS.reduce((sum, a) => sum + (summary[a] || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Audit Logs</h1>
                    <p className="text-stone-500 text-sm">Enterprise audit trail • Web & Android POS</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { fetchSummary(); goBack(); }} className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 text-sm">
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

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                <input
                    type="text" placeholder="Search employee, invoice, device ID... (press Enter)"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg py-2 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500"
                />
            </div>

            {/* MAIN CONTENT: Either Summary Dashboard or Drill-Down View */}
            {drillAction === null ? (
                /* ═══════════ SUMMARY DASHBOARD ═══════════ */
                summaryLoading ? (
                    <div className="p-12 text-center">
                        <RefreshCw size={32} className="mx-auto text-stone-600 mb-4 animate-spin" />
                        <p className="text-stone-400">Loading summary...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Total Overview */}
                        <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 text-center">
                            <p className="text-4xl font-bold text-stone-100">{summaryTotal}</p>
                            <p className="text-stone-500 text-sm mt-1">Total Events</p>
                            <div className="flex justify-center gap-8 mt-4">
                                <div>
                                    <p className="text-xl font-semibold text-red-400">{flaggedTotal}</p>
                                    <p className="text-stone-500 text-xs">Flagged</p>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-stone-400">{routineTotal}</p>
                                    <p className="text-stone-500 text-xs">Routine</p>
                                </div>
                            </div>
                        </div>

                        {/* Flagged Events — Needs Attention */}
                        {flaggedTotal > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Bell size={16} className="text-red-400" />
                                    <h2 className="text-stone-100 font-semibold text-sm">Needs Attention</h2>
                                    <span className="text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded-full">{flaggedTotal} events</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {FLAGGED_ACTIONS.map(actionKey => {
                                        const count = summary[actionKey] || 0;
                                        if (count === 0) return null;
                                        const config = getActionConfig(actionKey);
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={actionKey}
                                                onClick={() => fetchDrillDown(actionKey)}
                                                className={`${config.bgColor} border border-stone-700 hover:border-stone-500 rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Icon size={20} className={config.color} />
                                                    <ChevronRight size={16} className="text-stone-600" />
                                                </div>
                                                <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                                                <p className="text-stone-400 text-xs mt-0.5">{config.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {flaggedTotal === 0 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
                                <Bell size={40} className="mx-auto text-emerald-500 mb-3" />
                                <h2 className="text-lg font-semibold text-stone-100">All Clear</h2>
                                <p className="text-stone-400 text-sm mt-1">No flagged events. Everything looks normal.</p>
                            </div>
                        )}

                        {/* Routine Events — Quick Access */}
                        {routineTotal > 0 && (
                            <div>
                                <h2 className="text-stone-500 font-medium text-xs uppercase tracking-wider mb-3">Routine Activity</h2>
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                    {ROUTINE_ACTIONS.map(actionKey => {
                                        const count = summary[actionKey] || 0;
                                        if (count === 0) return null;
                                        const config = getActionConfig(actionKey);
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={actionKey}
                                                onClick={() => fetchDrillDown(actionKey)}
                                                className="bg-stone-900 border border-stone-800 hover:border-stone-600 rounded-lg p-3 text-center transition-all"
                                            >
                                                <Icon size={16} className={`${config.color} mx-auto mb-1`} />
                                                <p className="text-lg font-semibold text-stone-200">{count}</p>
                                                <p className="text-stone-500 text-[10px] mt-0.5">{config.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Any unknown/other actions */}
                        {Object.keys(summary).filter(k => !FLAGGED_ACTIONS.includes(k) && !ROUTINE_ACTIONS.includes(k)).length > 0 && (
                            <div>
                                <h2 className="text-stone-500 font-medium text-xs uppercase tracking-wider mb-3">Other</h2>
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {Object.entries(summary)
                                        .filter(([k]) => !FLAGGED_ACTIONS.includes(k) && !ROUTINE_ACTIONS.includes(k))
                                        .map(([actionKey, count]) => (
                                            <button
                                                key={actionKey}
                                                onClick={() => fetchDrillDown(actionKey)}
                                                className="bg-stone-900 border border-stone-800 hover:border-stone-600 rounded-lg p-3 text-center transition-all"
                                            >
                                                <p className="text-lg font-semibold text-stone-200">{count}</p>
                                                <p className="text-stone-500 text-[10px] mt-0.5">{actionKey.replace(/_/g, ' ')}</p>
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : (
                /* ═══════════ DRILL-DOWN VIEW ═══════════ */
                <div className="space-y-3">
                    {/* Back Button + Title */}
                    <div className="flex items-center gap-3">
                        <button onClick={goBack} className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 text-sm">
                            <ArrowLeft size={14} />
                            Back
                        </button>
                        <h2 className="text-stone-100 font-semibold">
                            {drillAction === 'SEARCH'
                                ? `Search: "${searchQuery}"`
                                : getActionConfig(drillAction).label
                            }
                        </h2>
                        <span className="text-stone-500 text-sm">{drillLogs.length} results</span>
                    </div>

                    {/* Logs Table */}
                    {drillLoading ? (
                        <div className="p-12 text-center">
                            <RefreshCw size={24} className="mx-auto text-stone-600 animate-spin" />
                        </div>
                    ) : drillLogs.length === 0 ? (
                        <div className="bg-stone-900 rounded-xl border border-stone-800 p-8 text-center">
                            <p className="text-stone-400">No logs found</p>
                        </div>
                    ) : (
                        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-stone-800/50">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-stone-400 text-xs font-medium">Time</th>
                                        <th className="text-left px-3 py-2 text-stone-400 text-xs font-medium">Action</th>
                                        <th className="text-left px-3 py-2 text-stone-400 text-xs font-medium">Employee</th>
                                        <th className="text-left px-3 py-2 text-stone-400 text-xs font-medium">Store</th>
                                        <th className="text-left px-3 py-2 text-stone-400 text-xs font-medium">Details</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800/30">
                                    {drillLogs.map(log => {
                                        const config = getActionConfig(log.action);
                                        const Icon = config.icon;
                                        return (
                                            <tr key={log.id} className="hover:bg-stone-800/30 cursor-pointer transition-colors" onClick={() => openInvestigate(log)}>
                                                <td className="px-3 py-2.5 text-stone-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.color} ${config.bgColor}`}>
                                                        <Icon size={12} />
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-stone-300 text-xs">{log.userEmail?.split('@')[0] || 'Unknown'}</td>
                                                <td className="px-3 py-2.5 text-orange-400 text-xs truncate max-w-[150px]">{log.storeName || <span className="text-stone-600">—</span>}</td>
                                                <td className="px-3 py-2.5 text-stone-200 text-xs">{formatDetails(log)}</td>
                                                <td className="px-2 py-2.5"><ChevronRight size={14} className="text-stone-600" /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                                    { label: 'Store', value: selectedLog.storeName || '—' },
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
