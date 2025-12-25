'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Filter, Download, Clock, FileText, Package, CheckCircle,
    User, ChevronRight, AlertCircle, Truck, Plus, X, Loader2
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

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await fetch('/api/admin/franchisors');
                if (response.ok) {
                    const data = await response.json();
                    // Convert franchisors to onboarding requests format
                    const onboardingRequests: OnboardingRequest[] = data.map((f: any) => {
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
    }, []);

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                        <Plus size={16} />
                        New Request
                    </button>
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
                            <Link href="/provider/clients/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
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
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                    <h3 className="font-medium text-stone-100 mb-4">Documents Awaiting Review</h3>
                    <div className="text-center py-8">
                        <FileText size={48} className="mx-auto text-stone-600 mb-4" />
                        <p className="text-stone-400">No documents pending review</p>
                    </div>
                </div>
            )}

            {activeTab === 'shipping' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    <Truck size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">No shipments</h2>
                    <p className="text-stone-400 mt-2">Shipments will appear here once devices are assigned and ready to ship</p>
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
