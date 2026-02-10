'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Filter, Download, Clock, FileText, Package, CheckCircle,
    User, ChevronRight, AlertCircle, Truck, Plus, X, Loader2, MoreHorizontal, Trash2
} from 'lucide-react';

type OnboardingTab = 'requests' | 'docs-inbox' | 'shipping';
type RequestStatus = 'submitted' | 'in-review' | 'waiting-docs' | 'approved' | 'shipped' | 'active' | 'rejected';

interface OnboardingRequest {
    id: string;
    type: string;
    client: string;  // Business/Store name
    ownerName: string;
    ownerEmail: string;
    phone?: string;
    status: RequestStatus;
    age: string;
    agent: string | null;
    docs: 'complete' | 'partial' | 'missing' | 'pending';
    devices: 'assigned' | 'partial' | 'pending';
    shipping: 'shipped' | 'in-transit' | 'ready' | 'pending';
}

// Status Badge
function StatusBadge({ status }: { status: RequestStatus }) {
    const colors: Record<RequestStatus, string> = {
        submitted: 'bg-blue-500/20 text-blue-400',
        'in-review': 'bg-purple-500/20 text-purple-400',
        'waiting-docs': 'bg-amber-500/20 text-amber-400',
        approved: 'bg-emerald-500/20 text-emerald-400',
        shipped: 'bg-cyan-500/20 text-cyan-400',
        active: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<RequestStatus, string> = {
        submitted: 'Submitted',
        'in-review': 'In Review',
        'waiting-docs': 'Waiting Docs',
        approved: 'Approved',
        shipped: 'Shipped',
        active: 'Active',
        rejected: 'Rejected',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}

function DocsBadge({ status }: { status: string }) {
    const config: Record<string, { color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
        complete: { color: 'text-emerald-400', icon: CheckCircle },
        partial: { color: 'text-amber-400', icon: AlertCircle },
        missing: { color: 'text-red-400', icon: AlertCircle },
        pending: { color: 'text-stone-500', icon: Clock },
        assigned: { color: 'text-emerald-400', icon: CheckCircle },
        ready: { color: 'text-blue-400', icon: Package },
        shipped: { color: 'text-emerald-400', icon: Truck },
        'in-transit': { color: 'text-cyan-400', icon: Truck },
    };
    const { color, icon: Icon } = config[status] || { color: 'text-stone-500', icon: Clock };
    return (
        <span className={`flex items-center gap-1 text-xs capitalize ${color}`}>
            <Icon size={12} />
            {status}
        </span>
    );
}

export default function OnboardingPage() {
    const [activeTab, setActiveTab] = useState<OnboardingTab>('requests');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [requests, setRequests] = useState<OnboardingRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        action: 'APPROVE' | 'REJECT';
        client: { id: string; name: string; ownerName: string };
    } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Request Docs Modal state
    const [requestDocsModal, setRequestDocsModal] = useState<{
        open: boolean;
        client: { id: string; name: string };
        subject: string;
        message: string;
    } | null>(null);

    // Shipment Modal state
    const [shipmentModal, setShipmentModal] = useState<{
        open: boolean;
        clientId: string;
        carrier: string;
        tracking: string;
        notes: string;
    }>({ open: false, clientId: '', carrier: 'FedEx', tracking: '', notes: '' });

    // Track active dropdown
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Delete confirmation modal
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
        open: boolean;
        shipmentId: string;
        trackingNumber: string;
    } | null>(null);

    // Shipments state
    const [shipments, setShipments] = useState<any[]>([]);

    const fetchShipments = async () => {
        try {
            const res = await fetch('/api/provider/onboarding/shipments');
            if (res.ok) {
                const data = await res.json();
                setShipments(data);
            }
        } catch (error) {
            console.error('Failed to fetch shipments', error);
        }
    };

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await fetch('/api/admin/franchisors');
                if (response.ok) {
                    const data = await response.json();
                    // Handle both array and { franchisors: [...] } formats
                    const franchisorsArray = Array.isArray(data) ? data : (data.franchisors || data.data || []);
                    // Convert franchisors to onboarding requests format
                    const onboardingRequests: OnboardingRequest[] = franchisorsArray.map((f: any) => {
                        // Determine docs status
                        const hasAllDocs = f.documents?.voidCheck && f.documents?.driverLicense && f.documents?.feinLetter;
                        const hasSomeDocs = f.documents?.voidCheck || f.documents?.driverLicense || f.documents?.feinLetter;
                        const docsStatus = hasAllDocs ? 'complete' : hasSomeDocs ? 'partial' : f.approvalStatus === 'PENDING' ? 'pending' : 'missing';

                        // Determine status based on approvalStatus
                        let status: RequestStatus = 'submitted';
                        if (f.approvalStatus === 'PENDING') status = 'submitted';
                        else if (f.approvalStatus === 'APPROVED') status = 'approved';
                        else if (f.approvalStatus === 'REJECTED') status = 'rejected';
                        else if (f.accountStatus === 'ACTIVE') status = 'active';

                        // Calculate age
                        const createdDate = new Date(f.createdAt);
                        const now = new Date();
                        const diffHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
                        const age = diffHours < 24 ? `${diffHours}h` : `${Math.floor(diffHours / 24)}d`;

                        return {
                            id: f.id,
                            type: f.businessType === 'BRAND_FRANCHISOR' ? 'Brand / Franchisor' : 'Multi-Store Owner',
                            client: f.businessName || f.name || 'Unknown Business',
                            ownerName: f.owner?.name || f.name || 'Unknown',
                            ownerEmail: f.owner?.email || '',
                            phone: f.phone || f.owner?.phone || '',
                            status,
                            age,
                            agent: null,
                            docs: docsStatus as any,
                            devices: f.franchises?.[0]?.locations?.some((l: any) => l.stations?.length > 0) ? 'assigned' : 'pending',
                            shipping: 'pending' as const,
                        };
                    });
                    setRequests(onboardingRequests);
                }
            } catch (error) {
                console.error('Error fetching onboarding requests:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
        if (activeTab === 'shipping') {
            fetchShipments();
        }
    }, [activeTab]);

    const tabs: { id: OnboardingTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'requests', label: 'Requests', icon: FileText },
        { id: 'docs-inbox', label: 'Docs Inbox', icon: FileText },
        { id: 'shipping', label: 'Shipping', icon: Truck },
    ];

    const quickFilters = [
        { label: 'Missing Docs', count: requests.filter(r => r.docs === 'missing' || r.docs === 'partial').length, color: 'red' },
        { label: 'Needs Devices', count: requests.filter(r => r.devices === 'pending').length, color: 'amber' },
        { label: 'Ready to Ship', count: requests.filter(r => r.shipping === 'ready').length, color: 'blue' },
        { label: 'Ready to Activate', count: requests.filter(r => r.status === 'shipped').length, color: 'emerald' },
    ];

    const filteredRequests = requests.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchQuery && !r.client.toLowerCase().includes(searchQuery.toLowerCase()) && !r.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Onboarding</h1>
                    <p className="text-sm text-stone-400 mt-1">Manage new client onboarding requests</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm">
                        <Download size={16} />
                        Export
                    </button>
                    {activeTab === 'shipping' ? (
                        <button
                            onClick={() => setShipmentModal(prev => ({ ...prev, open: true }))}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                        >
                            <Truck size={16} />
                            New Shipment
                        </button>
                    ) : (
                        <Link href="/provider/onboarding?action=new" className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                            <Plus size={16} />
                            New Request
                        </Link>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-stone-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id
                            ? 'text-orange-400 border-b-2 border-orange-500'
                            : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'requests' && (
                <>
                    {/* Quick Filters */}
                    <div className="flex items-center gap-2 mb-4">
                        {quickFilters.map((filter) => (
                            <button
                                key={filter.label}
                                className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors
                                    ${filter.color === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20' : ''}
                                    ${filter.color === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : ''}
                                    ${filter.color === 'blue' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : ''}
                                    ${filter.color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : ''}`}
                            >
                                {filter.label} ({filter.count})
                            </button>
                        ))}
                    </div>

                    {/* Search & Filters */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search by request #, client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="submitted">Submitted</option>
                            <option value="in-review">In Review</option>
                            <option value="waiting-docs">Waiting Docs</option>
                            <option value="approved">Approved</option>
                            <option value="shipped">Shipped</option>
                            <option value="active">Active</option>
                        </select>
                        <button className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-400 rounded-lg text-sm">
                            <Filter size={16} />
                            More Filters
                        </button>
                    </div>

                    {/* Table */}
                    {filteredRequests.length === 0 ? (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                            <FileText size={48} className="mx-auto text-stone-600 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-100">No onboarding requests</h2>
                            <p className="text-stone-400 mt-2">Create a new client to start an onboarding request</p>
                            <Link href="/provider/onboarding?action=new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} />
                                New Client
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-stone-800 bg-stone-900">
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Request #</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Type</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Client</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Status</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Age</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Agent</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Docs</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Devices</th>
                                        <th className="px-4 py-3 text-left text-stone-500 font-medium">Shipping</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map((req) => (
                                        <tr key={req.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <Link href={`/provider/onboarding/${req.id}`} className="font-mono text-orange-400 hover:underline text-xs">
                                                    {req.id}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-stone-300">{req.type}</td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-stone-100">{req.client}</p>
                                                    <p className="text-xs text-stone-500">{req.ownerName} · {req.ownerEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-stone-400">
                                                    <Clock size={12} />
                                                    {req.age}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {req.agent ? (
                                                    <span className="flex items-center gap-1 text-stone-300">
                                                        <User size={12} />
                                                        {req.agent}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400 text-xs">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3"><DocsBadge status={req.docs} /></td>
                                            <td className="px-4 py-3"><DocsBadge status={req.devices} /></td>
                                            <td className="px-4 py-3"><DocsBadge status={req.shipping} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {req.status === 'submitted' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setConfirmModal({
                                                                        open: true,
                                                                        action: 'APPROVE',
                                                                        client: { id: req.id, name: req.client, ownerName: req.ownerName }
                                                                    });
                                                                }}
                                                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setConfirmModal({
                                                                        open: true,
                                                                        action: 'REJECT',
                                                                        client: { id: req.id, name: req.client, ownerName: req.ownerName }
                                                                    });
                                                                }}
                                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-medium rounded transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link href={`/provider/onboarding/${req.id}`}>
                                                        <ChevronRight size={16} className="text-stone-600 hover:text-stone-400" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'docs-inbox' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden">
                    <div className="p-6 border-b border-stone-800">
                        <h3 className="font-medium text-stone-100 mb-1">Documents Awaiting Review</h3>
                        <p className="text-sm text-stone-400">Applications with uploaded documents that need verification</p>
                    </div>

                    {requests.filter(r => (r.docs === 'complete' || r.docs === 'partial') && r.status !== 'approved' && r.status !== 'active' && r.status !== 'rejected').length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle size={48} className="mx-auto text-stone-700 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-200">No pending reviews</h2>
                            <p className="text-stone-400 mt-2">All uploaded documents have been processed</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-800 bg-stone-900/50">
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Request</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Client</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Doc Status</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Submitted</th>
                                    <th className="px-6 py-3 text-right text-stone-500 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.filter(r => (r.docs === 'complete' || r.docs === 'partial') && r.status !== 'approved' && r.status !== 'active' && r.status !== 'rejected').map(req => (
                                    <tr key={req.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-orange-400">{req.id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-stone-100">{req.client}</p>
                                                <p className="text-xs text-stone-500">{req.ownerName}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <DocsBadge status={req.docs} />
                                        </td>
                                        <td className="px-6 py-4 text-stone-400 flex items-center gap-2">
                                            <Clock size={14} />
                                            {req.age}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setRequestDocsModal({
                                                        open: true,
                                                        client: { id: req.id, name: req.client },
                                                        subject: `Action Required: Additional Documents for ${req.client}`,
                                                        message: `Hello ${req.ownerName},\n\nWe are reviewing your onboarding application for ${req.client}. To proceed, we need the following additional documents:\n\n- \n- \n\nPlease reply to this email with the attached documents.\n\nThank you,\nOro 9 Onboarding Team`,
                                                    })}
                                                    className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/50 hover:border-amber-400 rounded-lg transition-colors"
                                                >
                                                    Request Docs
                                                </button>
                                                <Link
                                                    href={`/provider/onboarding/${req.id}`}
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/50 hover:border-blue-400 rounded-lg transition-colors"
                                                >
                                                    Review
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'shipping' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden">
                    {shipments.length === 0 ? (
                        <div className="text-center py-20">
                            <Truck size={48} className="mx-auto text-stone-700 mb-4" />
                            <h2 className="text-lg font-semibold text-stone-200">No shipments found</h2>
                            <p className="text-stone-400 mt-2">Create a new shipment to get started</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-800 bg-stone-900/50">
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Tracking #</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Client</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Carrier</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Status</th>
                                    <th className="px-6 py-3 text-left text-stone-500 font-medium">Date</th>
                                    <th className="px-6 py-3 text-right text-stone-500 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map((shipment) => (
                                    <tr key={shipment.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Package size={16} className="text-stone-400" />
                                                <span className="font-mono text-stone-300">{shipment.trackingNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-stone-100">{shipment.franchisor?.name || 'Unknown'}</p>
                                                <p className="text-xs text-stone-500">{shipment.franchisor?.owner?.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-stone-300">{shipment.carrier}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                In Transit
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-stone-400 text-xs">
                                            {new Date(shipment.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={
                                                        shipment.carrier === 'FedEx' ? `https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}` :
                                                            shipment.carrier === 'UPS' ? `https://www.ups.com/track?tracknum=${shipment.trackingNumber}` :
                                                                shipment.carrier === 'USPS' ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${shipment.trackingNumber}` :
                                                                    shipment.carrier === 'DHL' ? `https://www.dhl.com/en/express/tracking.html?AWB=${shipment.trackingNumber}` : '#'
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/50 hover:border-orange-400 rounded-lg transition-colors"
                                                >
                                                    Track
                                                </a>
                                                <button
                                                    onClick={() => setDeleteConfirmModal({
                                                        open: true,
                                                        shipmentId: shipment.id,
                                                        trackingNumber: shipment.trackingNumber
                                                    })}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/50 hover:border-red-400 rounded-lg transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-stone-100 mb-2">Delete Shipment?</h3>
                            <p className="text-sm text-stone-400">
                                Are you sure you want to delete shipment <span className="font-mono text-orange-400">{deleteConfirmModal.trackingNumber}</span>? This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmModal(null)}
                                className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors border border-stone-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/provider/onboarding/shipment', {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: deleteConfirmModal.shipmentId })
                                        });
                                        if (res.ok) {
                                            setShipments(prev => prev.filter(s => s.id !== deleteConfirmModal.shipmentId));
                                            setToast({ message: 'Shipment deleted successfully', type: 'success' });
                                            fetchShipments();
                                        } else {
                                            setToast({ message: 'Failed to delete shipment', type: 'error' });
                                        }
                                    } catch (err) {
                                        setToast({ message: 'Error deleting shipment', type: 'error' });
                                    }
                                    setDeleteConfirmModal(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Docs Modal */}
            {requestDocsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !processing && setRequestDocsModal(null)}>
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                                <AlertCircle className="text-amber-400" size={20} />
                                Request Documents
                            </h3>
                            <button onClick={() => !processing && setRequestDocsModal(null)} className="p-1 hover:bg-stone-800 rounded">
                                <X size={20} className="text-stone-400" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={requestDocsModal.subject}
                                    onChange={e => setRequestDocsModal({ ...requestDocsModal, subject: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Message</label>
                                <textarea
                                    value={requestDocsModal.message}
                                    onChange={e => setRequestDocsModal({ ...requestDocsModal, message: e.target.value })}
                                    className="w-full h-40 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRequestDocsModal(null)}
                                disabled={processing}
                                className="flex-1 py-3 border border-stone-600 text-stone-300 hover:bg-stone-800 rounded-xl font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setProcessing(true);
                                    try {
                                        const res = await fetch('/api/provider/onboarding/request-docs', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                franchisorId: requestDocsModal.client.id,
                                                subject: requestDocsModal.subject,
                                                message: requestDocsModal.message
                                            })
                                        });

                                        if (res.ok) {
                                            setToast({ message: 'Request sent successfully', type: 'success' });
                                            setRequestDocsModal(null);
                                        } else {
                                            setToast({ message: 'Failed to send request', type: 'error' });
                                        }
                                    } catch (err) {
                                        setToast({ message: 'Error sending request', type: 'error' });
                                    } finally {
                                        setProcessing(false);
                                    }
                                }}
                                disabled={processing}
                                className="flex-1 py-3 bg-white text-black hover:bg-stone-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : null}
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shipment Modal */}
            {shipmentModal.open && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !processing && setShipmentModal(prev => ({ ...prev, open: false }))}>
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                                <Truck className="text-blue-400" size={20} />
                                New Shipment
                            </h3>
                            <button onClick={() => !processing && setShipmentModal(prev => ({ ...prev, open: false }))} className="p-1 hover:bg-stone-800 rounded">
                                <X size={20} className="text-stone-400" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Client</label>
                                <select
                                    value={shipmentModal.clientId}
                                    onChange={e => setShipmentModal({ ...shipmentModal, clientId: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">Select a client...</option>
                                    {requests.filter(r => r.status === 'approved' || r.status === 'active').map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.client} ({r.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Carrier</label>
                                    <select
                                        value={shipmentModal.carrier}
                                        onChange={e => setShipmentModal({ ...shipmentModal, carrier: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="FedEx">FedEx</option>
                                        <option value="UPS">UPS</option>
                                        <option value="USPS">USPS</option>
                                        <option value="DHL">DHL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Tracking Number</label>
                                    <input
                                        type="text"
                                        value={shipmentModal.tracking}
                                        onChange={e => setShipmentModal({ ...shipmentModal, tracking: e.target.value })}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="Tracking #"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Notes</label>
                                <textarea
                                    value={shipmentModal.notes}
                                    onChange={e => setShipmentModal({ ...shipmentModal, notes: e.target.value })}
                                    className="w-full h-24 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                    placeholder="Optional shipping notes..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShipmentModal(prev => ({ ...prev, open: false }))}
                                disabled={processing}
                                className="flex-1 py-3 border border-stone-600 text-stone-300 hover:bg-stone-800 rounded-xl font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!shipmentModal.clientId || !shipmentModal.tracking) {
                                        setToast({ message: 'Client and Tracking Number are required', type: 'error' });
                                        return;
                                    }
                                    setProcessing(true);
                                    try {
                                        const res = await fetch('/api/provider/onboarding/shipment', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                franchisorId: shipmentModal.clientId,
                                                carrier: shipmentModal.carrier,
                                                trackingNumber: shipmentModal.tracking,
                                                notes: shipmentModal.notes
                                            })
                                        });

                                        if (res.ok) {
                                            setToast({ message: 'Shipment created successfully!', type: 'success' });
                                            setShipmentModal(prev => ({ ...prev, open: false, tracking: '', notes: '' }));
                                            fetchShipments(); // Update list
                                        } else {
                                            const data = await res.json();
                                            setToast({ message: data.message || 'Failed to create shipment', type: 'error' });
                                        }
                                    } catch (err) {
                                        setToast({ message: 'Error creating shipment', type: 'error' });
                                    } finally {
                                        setProcessing(false);
                                    }
                                }}
                                disabled={processing}
                                className="flex-1 py-3 bg-white text-black hover:bg-stone-200 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : null}
                                Create Shipment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Styled Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !processing && setConfirmModal(null)}>
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-stone-100">
                                {confirmModal.action === 'APPROVE' ? 'Approve Client' : 'Reject Client'}
                            </h3>
                            <button onClick={() => !processing && setConfirmModal(null)} className="p-1 hover:bg-stone-800 rounded">
                                <X size={20} className="text-stone-400" />
                            </button>
                        </div>

                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.action === 'APPROVE' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {confirmModal.action === 'APPROVE'
                                ? <CheckCircle size={32} className="text-emerald-400" />
                                : <AlertCircle size={32} className="text-red-400" />}
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-stone-300 mb-2">
                                Are you sure you want to <strong className={confirmModal.action === 'APPROVE' ? 'text-emerald-400' : 'text-red-400'}>{confirmModal.action.toLowerCase()}</strong> this client?
                            </p>
                            <div className="bg-stone-800/50 rounded-lg p-3">
                                <p className="font-bold text-white text-lg">{confirmModal.client.name}</p>
                                <p className="text-sm text-stone-400">Owner: {confirmModal.client.ownerName}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                disabled={processing}
                                className="flex-1 py-3 border border-stone-600 text-stone-300 hover:bg-stone-800 rounded-xl font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setProcessing(true);
                                    try {
                                        const res = await fetch('/api/admin/franchisors/approve', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ franchisorId: confirmModal.client.id, action: confirmModal.action })
                                        });
                                        if (res.ok) {
                                            setRequests(prev => prev.map(r =>
                                                r.id === confirmModal.client.id
                                                    ? { ...r, status: (confirmModal.action === 'APPROVE' ? 'approved' : 'rejected') as RequestStatus }
                                                    : r
                                            ));
                                            setToast({ message: `Client ${confirmModal.action.toLowerCase()}d successfully!`, type: 'success' });
                                        } else {
                                            const data = await res.json();
                                            setToast({ message: data.message || data.error || 'Action failed', type: 'error' });
                                        }
                                    } catch (err) {
                                        setToast({ message: 'Error processing request', type: 'error' });
                                    } finally {
                                        setProcessing(false);
                                        setConfirmModal(null);
                                    }
                                }}
                                disabled={processing}
                                className={`flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${confirmModal.action === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : null}
                                {confirmModal.action === 'APPROVE' ? 'Approve' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 z-50 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="text-white font-medium">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-white/20 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

