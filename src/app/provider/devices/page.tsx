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

type DeviceTab = 'accounts' | 'licenses' | 'stations' | 'requests';

// Types from old page
type PaxTerminal = {
    id: string;
    locationId: string;
    location: { id: string; name: string; franchise: { name: string } };
    paxTerminalIP: string | null;
    paxTerminalPort: string;
    processorMID: string | null;
};

type Station = {
    id: string;
    name: string;
    pairingCode: string;
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

    // PAX Terminals State
    const [paxTerminals, setPaxTerminals] = useState<PaxTerminal[]>([]);
    const [paxLoading, setPaxLoading] = useState(false);
    const [paxEditingId, setPaxEditingId] = useState<string | null>(null);
    const [paxSaving, setPaxSaving] = useState(false);
    const [paxEditForm, setPaxEditForm] = useState({ paxTerminalIP: '', paxTerminalPort: '10009', processorMID: '' });

    // Terminal Status Check
    const [checkingTerminalId, setCheckingTerminalId] = useState<string | null>(null);
    const [terminalStatus, setTerminalStatus] = useState<{ [key: string]: { status: string; message: string } }>({});

    // Stations State
    const [stationsByLocation, setStationsByLocation] = useState<{ [locationId: string]: Station[] }>({});
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
        fetchPaxTerminals();
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
    const fetchPaxTerminals = async () => {
        setPaxLoading(true);
        try {
            const res = await fetch('/api/terminals/manage');
            if (res.ok) {
                const terminals = await res.json();
                setPaxTerminals(terminals);
                // Pre-fetch stations for all locations so counts display correctly
                terminals.forEach((t: PaxTerminal) => {
                    fetchStationsForLocation(t.locationId);
                });
            }
        } catch (e) { console.error(e); }
        finally { setPaxLoading(false); setIsLoading(false); }
    };

    const fetchLicenses = async () => {
        try {
            const res = await fetch('/api/admin/terminals');
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
            if (res.ok) {
                const data = await res.json();
                setStationsByLocation(prev => ({ ...prev, [locationId]: data.stations || [] }));
            }
        } catch (e) { console.error(e); }
    };

    // PAX Terminal Functions
    const checkTerminalStatus = async (locationId: string, ipAddress: string, port: string = '10009') => {
        setCheckingTerminalId(locationId);
        try {
            const res = await fetch('/api/admin/terminals/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress, port })
            });
            const data = await res.json();
            setTerminalStatus(prev => ({
                ...prev,
                [locationId]: { status: data.status, message: data.message }
            }));
        } catch {
            setTerminalStatus(prev => ({
                ...prev,
                [locationId]: { status: 'ERROR', message: 'Failed to check' }
            }));
        } finally {
            setCheckingTerminalId(null);
        }
    };

    const startPaxEdit = (terminal: PaxTerminal) => {
        setPaxEditingId(terminal.locationId);
        setPaxEditForm({
            paxTerminalIP: terminal.paxTerminalIP || '',
            paxTerminalPort: terminal.paxTerminalPort || '10009',
            processorMID: terminal.processorMID || ''
        });
    };

    const handlePaxUpdate = async (locationId: string) => {
        setPaxSaving(true);
        try {
            const res = await fetch(`/api/terminals/manage/${locationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paxEditForm)
            });
            if (res.ok) {
                await fetchPaxTerminals();
                setPaxEditingId(null);
                setToast({ message: 'Terminal settings saved', type: 'success' });
            } else {
                setToast({ message: 'Failed to save', type: 'error' });
            }
        } catch (e) {
            setToast({ message: 'Error saving terminal', type: 'error' });
        } finally {
            setPaxSaving(false);
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

    // Filter
    const filteredTerminals = paxTerminals.filter(t =>
        t.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location.franchise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.paxTerminalIP && t.paxTerminalIP.includes(searchQuery))
    );

    const filteredLicenses = licenses.filter(l =>
        l.licenseKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs: { id: DeviceTab; label: string; count?: number }[] = [
        { id: 'accounts', label: 'Accounts' },
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
                        onClick={() => { fetchPaxTerminals(); fetchLicenses(); fetchRequests(); }}
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
                    {paxLoading ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <RefreshCw size={32} className="mx-auto text-stone-600 mb-4 animate-spin" />
                            <p className="text-stone-400">Loading accounts...</p>
                        </div>
                    ) : filteredTerminals.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <Monitor size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No accounts found</h2>
                            <p className="text-stone-400 mt-2">Add clients with locations to configure their terminals</p>
                        </div>
                    ) : (
                        filteredTerminals.map((terminal) => (
                            <div key={terminal.id} className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-700 transition-colors">
                                {/* Account Header */}
                                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-stone-100">{terminal.location.name}</h3>
                                        <p className="text-sm text-stone-400">{terminal.location.franchise.name}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {terminal.paxTerminalIP && (
                                            <button
                                                onClick={() => checkTerminalStatus(terminal.locationId, terminal.paxTerminalIP!, terminal.paxTerminalPort)}
                                                disabled={checkingTerminalId === terminal.locationId}
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm transition-colors disabled:opacity-50"
                                            >
                                                {checkingTerminalId === terminal.locationId ? (
                                                    <RefreshCw size={14} className="animate-spin" />
                                                ) : (
                                                    <Wifi size={14} />
                                                )}
                                                Check Status
                                            </button>
                                        )}
                                        {paxEditingId !== terminal.locationId && (
                                            <button
                                                onClick={() => startPaxEdit(terminal)}
                                                className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm"
                                            >
                                                <Edit size={14} />
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Status Display */}
                                {terminalStatus[terminal.locationId] && (
                                    <div className={`px-4 py-3 flex items-center gap-3 ${terminalStatus[terminal.locationId].status === 'ONLINE'
                                        ? 'bg-emerald-500/10 border-b border-emerald-500/20'
                                        : 'bg-red-500/10 border-b border-red-500/20'
                                        }`}>
                                        {terminalStatus[terminal.locationId].status === 'ONLINE' ? (
                                            <Wifi size={18} className="text-emerald-400" />
                                        ) : (
                                            <WifiOff size={18} className="text-red-400" />
                                        )}
                                        <div>
                                            <p className={`font-medium ${terminalStatus[terminal.locationId].status === 'ONLINE' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {terminalStatus[terminal.locationId].status}
                                            </p>
                                            <p className="text-sm text-stone-400">{terminalStatus[terminal.locationId].message}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Edit Form or Display */}
                                <div className="p-4">
                                    {paxEditingId === terminal.locationId ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-400 mb-2">Terminal IP Address</label>
                                                    <input
                                                        type="text"
                                                        value={paxEditForm.paxTerminalIP}
                                                        onChange={(e) => {
                                                            // Only allow digits and dots for IP address
                                                            const filtered = e.target.value.replace(/[^0-9.]/g, '');
                                                            setPaxEditForm({ ...paxEditForm, paxTerminalIP: filtered });
                                                        }}
                                                        placeholder="192.168.1.100"
                                                        maxLength={15}
                                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-400 mb-2">Port</label>
                                                    <input
                                                        type="text"
                                                        value={paxEditForm.paxTerminalPort}
                                                        onChange={(e) => {
                                                            // Only allow digits for port
                                                            const filtered = e.target.value.replace(/\D/g, '');
                                                            setPaxEditForm({ ...paxEditForm, paxTerminalPort: filtered });
                                                        }}
                                                        placeholder="10009"
                                                        maxLength={5}
                                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-stone-400 mb-2">Merchant ID (MID)</label>
                                                    <input
                                                        type="text"
                                                        value={paxEditForm.processorMID}
                                                        onChange={(e) => {
                                                            // Only allow alphanumeric for MID
                                                            const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                            setPaxEditForm({ ...paxEditForm, processorMID: filtered });
                                                        }}
                                                        placeholder="Optional"
                                                        maxLength={20}
                                                        className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => setPaxEditingId(null)}
                                                    className="flex items-center gap-2 px-4 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm"
                                                >
                                                    <X size={14} />
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handlePaxUpdate(terminal.locationId)}
                                                    disabled={paxSaving}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
                                                >
                                                    <Save size={14} />
                                                    {paxSaving ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-stone-500 mb-1">IP Address</p>
                                                <p className="text-stone-100 font-mono">
                                                    {terminal.paxTerminalIP || <span className="text-stone-600 italic">Not set</span>}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-stone-500 mb-1">Port</p>
                                                <p className="text-stone-100 font-mono">{terminal.paxTerminalPort}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-stone-500 mb-1">Merchant ID</p>
                                                <p className="text-stone-100 font-mono">
                                                    {terminal.processorMID || <span className="text-stone-600">—</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Stations Section */}
                                <div className="border-t border-stone-800">
                                    <button
                                        onClick={() => toggleLocationExpand(terminal.locationId)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-medium text-stone-300">
                                            <Smartphone size={16} />
                                            POS Stations ({stationsByLocation[terminal.locationId]?.length || 0})
                                        </span>
                                        <span className="text-stone-500 text-xs">
                                            {expandedLocationId === terminal.locationId ? '▼' : '▶'}
                                        </span>
                                    </button>

                                    {expandedLocationId === terminal.locationId && (
                                        <div className="px-4 pb-4 space-y-3">
                                            {/* Add Station Button */}
                                            {addingStationFor !== terminal.locationId && (
                                                <button
                                                    onClick={() => setAddingStationFor(terminal.locationId)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm"
                                                >
                                                    <Plus size={14} />
                                                    Add Station
                                                </button>
                                            )}

                                            {/* Add Station Form */}
                                            {addingStationFor === terminal.locationId && (
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
                                                        onClick={() => handleAddStation(terminal.locationId)}
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
                                            {stationsByLocation[terminal.locationId]?.length === 0 ? (
                                                <p className="text-stone-500 text-sm py-2">No stations configured</p>
                                            ) : (
                                                stationsByLocation[terminal.locationId]?.map((station) => (
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
                                                                onClick={() => handleRegenerateCode(terminal.locationId, station.id)}
                                                                disabled={regeneratingStationId === station.id}
                                                                className="p-2 text-orange-400 hover:bg-orange-500/20 rounded-lg disabled:opacity-50"
                                                                title="Regenerate pairing code"
                                                            >
                                                                <RefreshCw size={14} className={regeneratingStationId === station.id ? 'animate-spin' : ''} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStation(terminal.locationId, station.id)}
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
                    {paxTerminals.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <Smartphone size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No stations</h2>
                            <p className="text-stone-400 mt-2">Add locations and configure their POS stations in the Accounts tab</p>
                        </div>
                    ) : (
                        paxTerminals.map((terminal) => (
                            <div key={terminal.id} className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-stone-100">{terminal.location.name}</h3>
                                        <p className="text-sm text-stone-500">{terminal.location.franchise.name}</p>
                                    </div>
                                    <button
                                        onClick={() => { setExpandedLocationId(terminal.locationId); setAddingStationFor(terminal.locationId); fetchStationsForLocation(terminal.locationId); setActiveTab('accounts'); }}
                                        className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-sm"
                                    >
                                        <Plus size={14} />
                                        Manage Stations
                                    </button>
                                </div>
                                <p className="text-stone-400 text-sm">
                                    {stationsByLocation[terminal.locationId]?.length || 0} stations configured
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
                onSuccess={() => { fetchLicenses(); fetchPaxTerminals(); }}
                locations={locations}
            />

            {/* Transfer Terminal Modal */}
            <TransferTerminalModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                terminal={selectedTerminal}
                onSuccess={() => { fetchLicenses(); fetchPaxTerminals(); }}
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

