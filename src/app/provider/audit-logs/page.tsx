'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, Download, X, ChevronRight,
    DollarSign, CreditCard, UserCheck, Clock, Shield,
    AlertTriangle, Receipt, Package, Users, Settings,
    Building2, MapPin, Store, Bookmark, Filter, Eye
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
    createdAt: string;
}

interface FilterOption {
    id: string;
    name: string;
}

// Action type configs
const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    SALE_COMPLETED: { icon: DollarSign, color: 'text-green-400 bg-green-500/20', label: 'Sale' },
    REFUND_PROCESSED: { icon: Receipt, color: 'text-yellow-400 bg-yellow-500/20', label: 'Refund' },
    VOID_TRANSACTION: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/20', label: 'Void' },
    CASH_DRAWER_OPEN: { icon: DollarSign, color: 'text-blue-400 bg-blue-500/20', label: 'Drawer' },
    CLOCK_IN: { icon: Clock, color: 'text-green-400 bg-green-500/20', label: 'Clock In' },
    CLOCK_OUT: { icon: Clock, color: 'text-orange-400 bg-orange-500/20', label: 'Clock Out' },
    SHIFT_STARTED: { icon: UserCheck, color: 'text-green-400 bg-green-500/20', label: 'Shift Start' },
    SHIFT_ENDED: { icon: UserCheck, color: 'text-orange-400 bg-orange-500/20', label: 'Shift End' },
    PIN_LOGIN: { icon: Shield, color: 'text-blue-400 bg-blue-500/20', label: 'PIN Login' },
    LOGIN: { icon: Shield, color: 'text-blue-400 bg-blue-500/20', label: 'Login' },
    DISCOUNT_APPLIED: { icon: DollarSign, color: 'text-purple-400 bg-purple-500/20', label: 'Discount' },
    PRICE_OVERRIDE: { icon: DollarSign, color: 'text-red-400 bg-red-500/20', label: 'Price Override' },
    PERMISSIONS_CHANGED: { icon: Shield, color: 'text-yellow-400 bg-yellow-500/20', label: 'Permissions' },
    SETTINGS_UPDATED: { icon: Settings, color: 'text-blue-400 bg-blue-500/20', label: 'Settings' },
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

export default function AuditLogsPage() {
    // State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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
    const [savedViews, setSavedViews] = useState<{ name: string; filters: any }[]>([
        { name: 'Refunds Last 7d', filters: { actions: ['REFUND_PROCESSED'], days: 7 } },
        { name: 'After-hours Voids', filters: { actions: ['VOID_TRANSACTION'], afterHours: true } },
    ]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const totalPages = Math.ceil(logs.length / pageSize);
    const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Fetch group filter options
    const fetchFilters = async () => {
        try {
            // Fetch dealers
            const dealerRes = await fetch('/api/provider/dealers');
            if (dealerRes.ok) {
                const data = await dealerRes.json();
                setDealers(data.dealers || []);
            }

            // Get unique states from franchises
            const franchiseRes = await fetch('/api/admin/franchises');
            if (franchiseRes.ok) {
                const data = await franchiseRes.json();
                const uniqueStates = [...new Set((data.franchises || [])
                    .map((f: any) => f.state)
                    .filter(Boolean))] as string[];
                setStates(uniqueStates.map(s => ({ id: s, name: s })));
            }
        } catch (error) {
            console.error('Failed to fetch filters:', error);
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

                // Client-side filter for multiple actions
                if (selectedActions.length > 1) {
                    logsData = logsData.filter((log: AuditLog) => selectedActions.includes(log.action));
                }

                setLogs(logsData);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        }
        setLoading(false);
    };

    // Store search
    const searchStores = useCallback(async (query: string) => {
        if (query.length < 2) {
            setStoreSearchResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/admin/franchises?search=${encodeURIComponent(query)}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setStoreSearchResults((data.franchises || []).map((f: any) => ({
                    id: f.id,
                    name: `${f.name} — ${f.city || ''}, ${f.state || ''}`
                })));
            }
        } catch (error) {
            console.error('Store search error:', error);
        }
    }, []);

    // Toggle action filter
    const toggleAction = (actionId: string) => {
        setSelectedActions(prev =>
            prev.includes(actionId)
                ? prev.filter(a => a !== actionId)
                : [...prev, actionId]
        );
    };

    // Add store chip
    const addStore = (store: FilterOption) => {
        if (!selectedStores.find(s => s.id === store.id)) {
            setSelectedStores([...selectedStores, store]);
        }
        setStoreSearchQuery('');
        setStoreSearchResults([]);
        setShowStoreSearch(false);
    };

    // Remove store chip
    const removeStore = (storeId: string) => {
        setSelectedStores(selectedStores.filter(s => s.id !== storeId));
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    // Get action config
    const getActionConfig = (action: string) => {
        return ACTION_CONFIG[action] || { icon: Receipt, color: 'text-stone-400 bg-stone-500/20', label: action };
    };

    // Open investigate drawer
    const openInvestigate = (log: AuditLog) => {
        setSelectedLog(log);
        setShowInvestigateDrawer(true);
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${scope === s.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        <s.icon size={14} />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Group Filters Row */}
            <div className="bg-stone-900 rounded-lg border border-stone-800 p-3">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Dealer Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">Dealer:</span>
                        <select
                            value={selectedDealer}
                            onChange={(e) => setSelectedDealer(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                        >
                            <option value="ALL">All</option>
                            {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* State Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">State:</span>
                        <select
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                        >
                            <option value="ALL">All</option>
                            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500 text-xs">Status:</span>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                        >
                            <option value="ALL">All</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 ml-auto">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                        />
                        <span className="text-stone-500">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                        />
                    </div>
                </div>

                {/* Store Chips + Search */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-stone-500 text-xs">Stores:</span>
                    {selectedStores.map(store => (
                        <span key={store.id} className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                            {store.name.split(' — ')[0]}
                            <button onClick={() => removeStore(store.id)} className="hover:text-orange-200">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <div className="relative">
                        <button
                            onClick={() => setShowStoreSearch(!showStoreSearch)}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs text-stone-400"
                        >
                            + Add store
                        </button>
                        {showStoreSearch && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50">
                                <input
                                    type="text"
                                    placeholder="Search by name, city..."
                                    value={storeSearchQuery}
                                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 bg-transparent border-b border-stone-700 text-sm text-stone-200 placeholder-stone-500"
                                    autoFocus
                                />
                                <div className="max-h-48 overflow-auto">
                                    {storeSearchResults.map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => addStore(store)}
                                            className="w-full px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-700"
                                        >
                                            {store.name}
                                        </button>
                                    ))}
                                    {storeSearchQuery.length >= 2 && storeSearchResults.length === 0 && (
                                        <p className="px-3 py-2 text-stone-500 text-sm">No stores found</p>
                                    )}
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
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isActive ? action.color + ' border-current' : 'bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500'
                                }`}
                        >
                            <Icon size={14} />
                            {action.label}
                        </button>
                    );
                })}
                {selectedActions.length > 0 && (
                    <button
                        onClick={() => setSelectedActions([])}
                        className="px-3 py-1.5 text-stone-500 hover:text-stone-300 text-sm"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Saved Views */}
            <div className="flex items-center gap-2">
                <Bookmark size={14} className="text-stone-500" />
                <span className="text-stone-500 text-xs">Saved:</span>
                {savedViews.map((view, i) => (
                    <button key={i} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs text-stone-400">
                        {view.name}
                    </button>
                ))}
                <button className="px-2 py-1 text-orange-400 hover:text-orange-300 text-xs">
                    + Save current
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                <input
                    type="text"
                    placeholder="Search employee, invoice, device ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg py-2 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500"
                />
            </div>

            {/* Stats Row */}
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

            {/* Logs Table */}
            <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
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
                    <tbody className="divide-y divide-stone-800">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-stone-500">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-stone-500">No logs found</td></tr>
                        ) : (
                            paginatedLogs.map(log => {
                                const config = getActionConfig(log.action);
                                const Icon = config.icon;
                                const storeName = log.changes?.franchiseId ? log.changes.franchiseId.slice(-8) : 'N/A';
                                return (
                                    <tr key={log.id} className="hover:bg-stone-800/50 cursor-pointer" onClick={() => openInvestigate(log)}>
                                        <td className="px-3 py-2 text-stone-400 text-xs">{formatDate(log.createdAt)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${config.color}`}>
                                                <Icon size={12} />
                                                {config.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-stone-300 text-xs">{log.userEmail?.split('@')[0] || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-stone-400 text-xs font-mono">{storeName}</td>
                                        <td className="px-3 py-2 text-stone-500 text-xs truncate max-w-xs">
                                            {log.changes ? JSON.stringify(log.changes).slice(0, 40) + '...' : '-'}
                                        </td>
                                        <td className="px-2 py-2">
                                            <ChevronRight size={14} className="text-stone-600" />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border border-stone-800 rounded-lg">
                <div className="flex items-center gap-4">
                    <span className="text-stone-400 text-sm">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, logs.length)} of {logs.length}
                    </span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200"
                    >
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                        <option value={200}>200 per page</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-stone-300"
                    >
                        ← Prev
                    </button>
                    <span className="px-3 py-1.5 text-stone-300 text-sm">
                        Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-stone-300"
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Investigate Drawer */}
            {showInvestigateDrawer && selectedLog && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowInvestigateDrawer(false)} />
                    <div className="fixed right-0 top-0 h-full w-96 bg-stone-900 border-l border-stone-800 z-50 overflow-auto">
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-stone-100">Investigate</h2>
                            <button onClick={() => setShowInvestigateDrawer(false)} className="text-stone-400 hover:text-stone-200">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Log Details */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-stone-500 text-xs">Action</p>
                                    <p className="text-stone-200">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Time</p>
                                    <p className="text-stone-200">{formatDate(selectedLog.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Employee</p>
                                    <p className="text-stone-200">{selectedLog.userEmail}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Role</p>
                                    <p className="text-stone-200">{selectedLog.userRole}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Entity</p>
                                    <p className="text-stone-200 font-mono text-sm">{selectedLog.entityType}: {selectedLog.entityId}</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="border-t border-stone-800 pt-4 space-y-2">
                                <p className="text-stone-400 text-xs font-medium">Quick Actions</p>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">
                                    Show all by this employee (24h)
                                </button>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">
                                    Show all at this store (today)
                                </button>
                                <button className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded text-sm text-stone-300">
                                    View transaction
                                </button>
                            </div>

                            {/* Full Details */}
                            <div className="border-t border-stone-800 pt-4">
                                <p className="text-stone-400 text-xs font-medium mb-2">Full Details</p>
                                <pre className="bg-stone-800 rounded p-3 text-stone-300 text-xs overflow-auto max-h-64">
                                    {JSON.stringify(selectedLog.changes, null, 2)}
                                </pre>
                            </div>

                            {/* Export */}
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
