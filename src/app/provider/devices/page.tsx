'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search, Filter, Plus, HardDrive, Wifi, WifiOff, Truck, Package, MoreHorizontal,
    Key, Smartphone, RefreshCw, Edit, Save, X, Trash2, Monitor, Activity, Settings, Check, ArrowRightLeft
} from 'lucide-react';
import AddTerminalModal from '@/components/modals/AddTerminalModal';
import TransferTerminalModal from '@/components/modals/TransferTerminalModal';
import { formatDistanceToNow } from 'date-fns';
import { DEFAULT_PAX_PORT } from '@/lib/constants/provider';

type DeviceTab = 'accounts' | 'licenses' | 'stations' | 'requests';

// Types matching the /api/terminals/manage response shape
type PaymentTerminal = {
    id: string;
    name: string;
    terminalType: string;
    terminalIP: string;
    terminalPort: string;
    isActive: boolean;
    assignedStation: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
};

type LocationAccount = {
    locationId: string;
    locationName: string;
    franchiseName: string;
    legacyIP: string | null;
    legacyPort: string | null;
    legacyMID: string | null;
    terminals: PaymentTerminal[];
    stations: { id: string; name: string; isActive: boolean }[];
    updatedAt: string;
};

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        ACTIVE: 'bg-emerald-500/20 text-emerald-400',
        PENDING: 'bg-amber-500/20 text-amber-400',
        INACTIVE: 'bg-stone-700 text-stone-400',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-stone-700 text-stone-400'}`}>{status}</span>;
}

export default function DevicesPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<DeviceTab>('accounts');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Licenses State
    const [licenses, setLicenses] = useState<any[]>([]);

    // Location Accounts State (from /api/terminals/manage)
    const [accounts, setAccounts] = useState<LocationAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);

    // Inline Add Terminal Form State
    const [addingTerminalFor, setAddingTerminalFor] = useState<string | null>(null);
    const [newTerminalForm, setNewTerminalForm] = useState({ name: '', terminalIP: '', terminalPort: DEFAULT_PAX_PORT, stationId: '' });
    const [savingTerminal, setSavingTerminal] = useState(false);
    const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
    const [editTerminalForm, setEditTerminalForm] = useState({ name: '', terminalIP: '', terminalPort: DEFAULT_PAX_PORT });

    // Terminal Status Check
    const [checkingTerminalId, setCheckingTerminalId] = useState<string | null>(null);
    const [terminalStatus, setTerminalStatus] = useState<{ [key: string]: { status: string; message: string } }>({});

    // Stations State
    const [stationsByLocation, setStationsByLocation] = useState<{ [locationId: string]: any[] }>({});
    const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
    const [addingStationFor, setAddingStationFor] = useState<string | null>(null);
    const [newStationName, setNewStationName] = useState('');
    const [newStationCode, setNewStationCode] = useState('');

    // Requests State
    const [requests, setRequests] = useState<any[]>([]);
    const [approving, setApproving] = useState<string | null>(null);
    const [regeneratingStationId, setRegeneratingStationId] = useState<string | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedTerminal, setSelectedTerminal] = useState<any>(null);
    const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchAccounts();
        fetchLicenses();
        fetchLocations();
        fetchRequests();
    }, [session]);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // Fetch Functions
    const fetchAccounts = async () => {
        setAccountsLoading(true);
        try {
            const res = await fetch('/api/terminals/manage');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
                // Pre-populate stationsByLocation from accounts data
                data.forEach((acct: LocationAccount) => {
                    fetchStationsForLocation(acct.locationId);
                });
            }
        } catch (e) { console.error(e); }
        finally { setAccountsLoading(false); setIsLoading(false); }
    };

    const fetchLicenses = async () => {
        try {
            const res = await fetch('/api/provider/terminals');
            const data = await res.json();
            if (data.licenses) setLicenses(data.licenses);
        } catch (e) { console.error(e); }
    };

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/franchise/locations');
            const data = await res.json();
            if (data.locations) setLocations(data.locations);
        } catch (e) { console.error(e); }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/requests');
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
        } catch (e) { console.error(e); }
    };

    const fetchStationsForLocation = async (locationId: string) => {
        try {
            const res = await fetch(`/api/settings/stations?locationId=${locationId}`);
            const data = await res.json();
            if (res.ok) {
                setStationsByLocation(prev => ({ ...prev, [locationId]: data.stations || [] }));
            }
        } catch (e) { console.log('[Devices] fetchStationsForLocation error:', e); }
    };

    // Terminal Functions
    const checkTerminalStatus = async (terminalId: string, ipAddress: string, port: string = DEFAULT_PAX_PORT) => {
        setCheckingTerminalId(terminalId);
        try {
            const res = await fetch('/api/provider/terminals/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress, port })
            });
            const data = await res.json();
            setTerminalStatus(prev => ({
                ...prev,
                [terminalId]: { status: data.status, message: data.message }
            }));
        } catch {
            setTerminalStatus(prev => ({
                ...prev,
                [terminalId]: { status: 'ERROR', message: 'Failed to check' }
            }));
        } finally {
            setCheckingTerminalId(null);
        }
    };

    const handleAddTerminal = async (locationId: string) => {
        if (!newTerminalForm.name || !newTerminalForm.terminalIP) {
            setToast({ message: 'Name and IP are required', type: 'error' });
            return;
        }
        setSavingTerminal(true);
        try {
            const res = await fetch('/api/terminals/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    name: newTerminalForm.name,
                    terminalIP: newTerminalForm.terminalIP,
                    terminalPort: newTerminalForm.terminalPort || DEFAULT_PAX_PORT,
                    stationId: newTerminalForm.stationId || undefined
                })
            });
            if (res.ok) {
                await fetchAccounts();
                setAddingTerminalFor(null);
                setNewTerminalForm({ name: '', terminalIP: '', terminalPort: DEFAULT_PAX_PORT, stationId: '' });
                setToast({ message: 'Terminal added', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to add', type: 'error' });
            }
        } catch (e) {
            setToast({ message: 'Error adding terminal', type: 'error' });
        } finally {
            setSavingTerminal(false);
        }
    };

    const handleDeleteTerminal = async (terminalId: string) => {
        if (!confirm('Delete this terminal?')) return;
        try {
            const res = await fetch(`/api/terminals/manage/${terminalId}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchAccounts();
                setToast({ message: 'Terminal deleted', type: 'success' });
            }
        } catch (e) { console.log(e); }
    };

    const handleAssignStation = async (terminalId: string, stationId: string) => {
        try {
            const res = await fetch(`/api/terminals/manage/${terminalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stationId: stationId || null })
            });
            if (res.ok) {
                await fetchAccounts();
                setToast({ message: 'Station assigned', type: 'success' });
            }
        } catch (e) { console.log(e); }
    };

    const handleUpdateTerminal = async (terminalId: string) => {
        setSavingTerminal(true);
        try {
            const res = await fetch(`/api/terminals/manage/${terminalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editTerminalForm.name,
                    terminalIP: editTerminalForm.terminalIP,
                    terminalPort: editTerminalForm.terminalPort
                })
            });
            if (res.ok) {
                await fetchAccounts();
                setEditingTerminalId(null);
                setToast({ message: 'Terminal updated', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to update', type: 'error' });
            }
        } catch (e) {
            setToast({ message: 'Error updating terminal', type: 'error' });
        } finally {
            setSavingTerminal(false);
        }
    };

    // Station Functions
    const toggleLocationExpand = (locationId: string) => {
        if (expandedLocationId === locationId) {
            setExpandedLocationId(null);
        } else {
            setExpandedLocationId(locationId);
            if (!stationsByLocation[locationId]) {
                fetchStationsForLocation(locationId);
            }
        }
    };

    const handleAddStation = async (locationId: string) => {
        if (!newStationName) return;  // Code not needed - backend generates it
        try {
            const res = await fetch('/api/settings/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId, name: newStationName })  // No pairingCode - backend generates 8-char
            });
            if (res.ok) {
                fetchStationsForLocation(locationId);
                setNewStationName('');
                setNewStationCode('');
                setAddingStationFor(null);
                setToast({ message: 'Station added', type: 'success' });
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteStation = async (locationId: string, stationId: string) => {
        if (!confirm('Delete this station?')) return;
        try {
            const res = await fetch(`/api/settings/stations?id=${stationId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchStationsForLocation(locationId);
                setToast({ message: 'Station deleted', type: 'success' });
            }
        } catch (e) { console.error(e); }
    };

    // Regenerate pairing code (for hardware replacement)
    const handleRegenerateCode = async (locationId: string, stationId: string) => {
        setRegeneratingStationId(stationId);
        try {
            const res = await fetch(`/api/settings/stations/${stationId}/regenerate-code`, { method: 'POST' });
            if (res.ok) {
                fetchStationsForLocation(locationId);
                setToast({ message: 'New pairing code generated', type: 'success' });
            } else {
                setToast({ message: 'Failed to regenerate code', type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setToast({ message: 'Error regenerating code', type: 'error' });
        } finally {
            setRegeneratingStationId(null);
        }
    };

    // Request Functions
    const handleApprove = async (requestId: string) => {
        setApproving(requestId);
        try {
            const res = await fetch(`/api/admin/requests/${requestId}/approve`, { method: 'POST' });
            if (res.ok) {
                fetchRequests();
                fetchLicenses();
                setToast({ message: 'Request approved', type: 'success' });
            }
        } catch (e) { console.error(e); }
        finally { setApproving(null); }
    };

    // Filter accounts by search
    const filteredAccounts = accounts.filter(a =>
        a.locationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.franchiseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.legacyIP?.includes(searchQuery) ||
        a.terminals.some(t => t.terminalIP?.includes(searchQuery))
    );

    const filteredLicenses = licenses.filter(l =>
        l.licenseKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs: { id: DeviceTab; label: string; count?: number }[] = [
        { id: 'accounts', label: 'Accounts', count: accounts.length },
        { id: 'licenses', label: 'Licenses', count: licenses.filter(l => l.status === 'ACTIVE').length },
        { id: 'stations', label: 'Stations' },
        { id: 'requests', label: 'Requests', count: requests.length },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Devices & Terminals</h1>
                    <p className="text-sm text-stone-400 mt-1">Manage PAX terminals, licenses, and POS stations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { fetchAccounts(); fetchLicenses(); fetchRequests(); }}
                        className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                    >
                        <Plus size={16} />
                        Add Terminal
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-stone-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'text-orange-400 border-b-2 border-orange-500' : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-orange-500/20' : 'bg-stone-800'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, IP, license..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* ACCOUNTS TAB - PAX Terminal Configuration */}
            {activeTab === 'accounts' && (
                <div className="space-y-4">
                    {accountsLoading ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <RefreshCw size={32} className="mx-auto text-stone-600 mb-4 animate-spin" />
                            <p className="text-stone-400">Loading accounts...</p>
                        </div>
                    ) : filteredAccounts.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <Monitor size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No accounts found</h2>
                            <p className="text-stone-400 mt-2">Add clients with locations to configure their terminals</p>
                        </div>
                    ) : (
                        filteredAccounts.map((account) => (
                            <div key={account.locationId} className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-700 transition-colors">
                                {/* Account Header */}
                                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-stone-100">{account.locationName}</h3>
                                        <p className="text-sm text-stone-400">{account.franchiseName} · {account.terminals.length} terminal{account.terminals.length !== 1 ? 's' : ''} · {account.stations.length} station{account.stations.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <button
                                        onClick={() => { setAddingTerminalFor(addingTerminalFor === account.locationId ? null : account.locationId); setNewTerminalForm({ name: '', terminalIP: '', terminalPort: DEFAULT_PAX_PORT, stationId: '' }); }}
                                        className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-sm font-medium"
                                    >
                                        <Plus size={14} />
                                        Add Terminal
                                    </button>
                                </div>

                                {/* Add Terminal Inline Form */}
                                {addingTerminalFor === account.locationId && (
                                    <div className="p-4 border-b border-stone-800 bg-stone-800/30">
                                        <p className="text-xs font-medium text-stone-400 mb-3">Add New CC Machine / Terminal</p>
                                        <div className="grid grid-cols-4 gap-3 mb-3">
                                            <input
                                                type="text" placeholder="Terminal Name (e.g. PAX-1)"
                                                value={newTerminalForm.name}
                                                onChange={(e) => setNewTerminalForm({ ...newTerminalForm, name: e.target.value })}
                                                className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <input
                                                type="text" placeholder="IP (192.168.1.100)"
                                                value={newTerminalForm.terminalIP}
                                                onChange={(e) => setNewTerminalForm({ ...newTerminalForm, terminalIP: e.target.value.replace(/[^0-9.]/g, '') })}
                                                maxLength={15}
                                                className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <input
                                                type="text" placeholder="Port (10009)"
                                                value={newTerminalForm.terminalPort}
                                                onChange={(e) => setNewTerminalForm({ ...newTerminalForm, terminalPort: e.target.value.replace(/\D/g, '') })}
                                                maxLength={5}
                                                className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <select
                                                value={newTerminalForm.stationId}
                                                onChange={(e) => setNewTerminalForm({ ...newTerminalForm, stationId: e.target.value })}
                                                className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            >
                                                <option value="">Assign to Station...</option>
                                                {account.stations.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setAddingTerminalFor(null)} className="px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm">Cancel</button>
                                            <button
                                                onClick={() => handleAddTerminal(account.locationId)}
                                                disabled={savingTerminal || !newTerminalForm.name || !newTerminalForm.terminalIP}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
                                            >
                                                <Save size={14} />
                                                {savingTerminal ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Terminals List */}
                                <div className="divide-y divide-stone-800/50">
                                    {account.terminals.length === 0 ? (
                                        <div className="p-4 text-center">
                                            <p className="text-stone-500 text-sm">No terminals configured. Click "Add Terminal" above.</p>
                                        </div>
                                    ) : (
                                        account.terminals.map((term) => (
                                            <div key={term.id} className="p-4">
                                                {editingTerminalId === term.id ? (
                                                    /* Edit mode for this terminal */
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="block text-xs text-stone-500 mb-1">Name</label>
                                                                <input type="text" value={editTerminalForm.name}
                                                                    onChange={(e) => setEditTerminalForm({ ...editTerminalForm, name: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-stone-500 mb-1">IP Address</label>
                                                                <input type="text" value={editTerminalForm.terminalIP}
                                                                    onChange={(e) => setEditTerminalForm({ ...editTerminalForm, terminalIP: e.target.value.replace(/[^0-9.]/g, '') })}
                                                                    maxLength={15}
                                                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-stone-500 mb-1">Port</label>
                                                                <input type="text" value={editTerminalForm.terminalPort}
                                                                    onChange={(e) => setEditTerminalForm({ ...editTerminalForm, terminalPort: e.target.value.replace(/\D/g, '') })}
                                                                    maxLength={5}
                                                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setEditingTerminalId(null)} className="px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm"><X size={14} /></button>
                                                            <button onClick={() => handleUpdateTerminal(term.id)} disabled={savingTerminal}
                                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
                                                                <Save size={14} /> {savingTerminal ? 'Saving...' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Display mode */
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                                                <Monitor size={16} className="text-orange-400" />
                                                            </div>
                                                            <div className="min-w-[120px]">
                                                                <p className="text-stone-100 font-medium text-sm">{term.name}</p>
                                                                <p className="text-stone-500 text-xs font-mono">{term.terminalIP}:{term.terminalPort}</p>
                                                            </div>
                                                            {/* Station Assignment Dropdown */}
                                                            <div className="flex items-center gap-2">
                                                                <Smartphone size={14} className="text-stone-500" />
                                                                <select
                                                                    value={term.assignedStation?.id || ''}
                                                                    onChange={(e) => handleAssignStation(term.id, e.target.value)}
                                                                    className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                                >
                                                                    <option value="">Unassigned</option>
                                                                    {account.stations.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {/* Status badge */}
                                                            {terminalStatus[term.id] && (
                                                                <span className={`text-xs px-2 py-0.5 rounded ${terminalStatus[term.id].status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                    {terminalStatus[term.id].status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => checkTerminalStatus(term.id, term.terminalIP, term.terminalPort)}
                                                                disabled={checkingTerminalId === term.id}
                                                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg disabled:opacity-50" title="Check status">
                                                                {checkingTerminalId === term.id ? <RefreshCw size={14} className="animate-spin" /> : <Wifi size={14} />}
                                                            </button>
                                                            <button onClick={() => { setEditingTerminalId(term.id); setEditTerminalForm({ name: term.name, terminalIP: term.terminalIP, terminalPort: term.terminalPort }); }}
                                                                className="p-2 text-stone-400 hover:bg-stone-700 rounded-lg" title="Edit terminal">
                                                                <Edit size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteTerminal(term.id)}
                                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Delete terminal">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Stations Section */}
                                <div className="border-t border-stone-800">
                                    <button
                                        onClick={() => toggleLocationExpand(account.locationId)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-medium text-stone-300">
                                            <Smartphone size={16} />
                                            POS Stations ({stationsByLocation[account.locationId]?.length || 0})
                                        </span>
                                        <span className="text-stone-500 text-xs">
                                            {expandedLocationId === account.locationId ? '▼' : '▶'}
                                        </span>
                                    </button>

                                    {expandedLocationId === account.locationId && (
                                        <div className="px-4 pb-4 space-y-3">
                                            {/* Add Station Button */}
                                            {addingStationFor !== account.locationId && (
                                                <button
                                                    onClick={() => setAddingStationFor(account.locationId)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm"
                                                >
                                                    <Plus size={14} />
                                                    Add Station
                                                </button>
                                            )}

                                            {/* Add Station Form */}
                                            {addingStationFor === account.locationId && (
                                                <div className="flex gap-2 p-3 bg-stone-800/50 rounded-lg items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="REG1"
                                                        value={newStationName}
                                                        onChange={(e) => setNewStationName(e.target.value)}
                                                        maxLength={30}
                                                        className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm"
                                                    />
                                                    <span className="px-3 py-2 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/30">
                                                        🔒 8-char code auto
                                                    </span>
                                                    <button
                                                        onClick={() => handleAddStation(account.locationId)}
                                                        disabled={!newStationName}
                                                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setAddingStationFor(null); setNewStationName(''); }}
                                                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Station List */}
                                            {stationsByLocation[account.locationId]?.length === 0 ? (
                                                <p className="text-stone-500 text-sm py-2">No stations configured</p>
                                            ) : (
                                                stationsByLocation[account.locationId]?.map((station: any) => (
                                                    <div key={station.id} className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Smartphone size={16} className="text-blue-400" />
                                                            <div>
                                                                <p className="text-stone-100 text-sm font-medium">{station.name}</p>
                                                                <p className="text-stone-500 text-xs font-mono">{station.pairingCode}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleRegenerateCode(account.locationId, station.id)}
                                                                disabled={regeneratingStationId === station.id}
                                                                className="p-2 text-orange-400 hover:bg-orange-500/20 rounded-lg disabled:opacity-50"
                                                                title="Regenerate pairing code"
                                                            >
                                                                <RefreshCw size={14} className={regeneratingStationId === station.id ? 'animate-spin' : ''} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStation(account.locationId, station.id)}
                                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* LICENSES TAB */}
            {activeTab === 'licenses' && (
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-stone-900/50 rounded-xl border border-emerald-500/30 p-4">
                            <p className="text-sm text-stone-400">Active Licenses</p>
                            <p className="text-2xl font-bold text-emerald-400">{licenses.filter(l => l.status === 'ACTIVE').length}</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <p className="text-sm text-stone-400">Pending Activation</p>
                            <p className="text-2xl font-bold text-stone-100">{licenses.filter(l => l.status === 'PENDING').length}</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <p className="text-sm text-stone-400">Total Licenses</p>
                            <p className="text-2xl font-bold text-stone-100">{licenses.length}</p>
                        </div>
                    </div>

                    {filteredLicenses.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <Key size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No licenses</h2>
                            <p className="text-stone-400 mt-2">Licenses will appear here once terminals are added</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredLicenses.map((license) => (
                                <div key={license.id} className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-700 transition-colors">
                                    <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${license.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}>
                                                <Key size={18} />
                                            </div>
                                            <div>
                                                <p className="font-mono text-sm text-stone-200">{license.licenseKey}</p>
                                                <p className="text-xs text-stone-500">{license.location?.name || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={license.status} />
                                    </div>
                                    <div className="p-4">
                                        {license.terminals?.length > 0 ? (
                                            license.terminals.map((term: any) => (
                                                <div key={term.id} className="flex items-center gap-2 p-2 bg-stone-800/50 rounded-lg">
                                                    <Smartphone size={14} className="text-stone-400" />
                                                    <div>
                                                        <p className="text-xs text-stone-300">{term.model}</p>
                                                        <p className="text-[10px] text-stone-500 font-mono">{term.serialNumber}</p>
                                                    </div>
                                                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-stone-500 text-xs flex items-center gap-2">
                                                <WifiOff size={12} />
                                                No hardware connected
                                            </p>
                                        )}
                                        <p className="text-xs text-stone-500 mt-3">
                                            Issued {license.createdAt ? formatDistanceToNow(new Date(license.createdAt), { addSuffix: true }) : 'recently'}
                                        </p>
                                    </div>
                                    {/* License Actions */}
                                    <div className="p-3 bg-stone-800/30 border-t border-stone-800 flex items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedTerminal(license); setShowTransferModal(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-700 rounded-lg transition-colors"
                                        >
                                            <ArrowRightLeft size={14} />
                                            Transfer
                                        </button>
                                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-700 rounded-lg transition-colors">
                                            <Settings size={14} />
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* STATIONS TAB - Browse all stations by location */}
            {activeTab === 'stations' && (
                <div className="space-y-4">
                    {accounts.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <Smartphone size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No stations</h2>
                            <p className="text-stone-400 mt-2">Add locations and configure their POS stations in the Accounts tab</p>
                        </div>
                    ) : (
                        accounts.map((account) => (
                            <div key={account.locationId} className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-stone-100">{account.locationName}</h3>
                                        <p className="text-sm text-stone-500">{account.franchiseName}</p>
                                    </div>
                                    <button
                                        onClick={() => { setExpandedLocationId(account.locationId); setAddingStationFor(account.locationId); fetchStationsForLocation(account.locationId); setActiveTab('accounts'); }}
                                        className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-sm"
                                    >
                                        <Plus size={14} />
                                        Manage Stations
                                    </button>
                                </div>
                                <p className="text-stone-400 text-sm">
                                    {stationsByLocation[account.locationId]?.length || 0} stations configured
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <HardDrive size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No pending requests</h2>
                            <p className="text-stone-400 mt-2">Terminal requests from franchisors will appear here</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-stone-900/50 rounded-xl border border-stone-800 p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-stone-100">{req.franchisor?.name}</h3>
                                    <p className="text-stone-400">
                                        Requesting <span className="text-orange-400 font-bold">{req.numberOfStations} Stations</span> for <span className="text-stone-200">{req.location?.name}</span>
                                    </p>
                                    <p className="text-xs text-stone-500 mt-1">
                                        Owner: {req.franchisor?.owner?.name} ({req.franchisor?.owner?.email})
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleApprove(req.id)}
                                    disabled={approving === req.id}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    {approving === req.id ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Terminal Modal */}
            <AddTerminalModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => { fetchLicenses(); fetchAccounts(); }}
                locations={locations}
            />

            {/* Transfer Terminal Modal */}
            <TransferTerminalModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                terminal={selectedTerminal}
                onSuccess={() => { fetchLicenses(); fetchAccounts(); }}
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    );
}

