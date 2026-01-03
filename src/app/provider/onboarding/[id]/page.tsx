'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Clock, User, FileText, Building2, MapPin, HardDrive,
    Truck, CheckCircle, Play, MoreHorizontal, ChevronDown, Upload,
    Mail, Phone, Plus, Wifi, Package, AlertCircle, X
} from 'lucide-react';

type OnboardingTab = 'overview' | 'business' | 'documents' | 'hardware' | 'shipping' | 'activation' | 'timeline';

export default function OnboardingDetailPage() {
    const params = useParams();
    const requestId = params.id as string;
    const [activeTab, setActiveTab] = useState<OnboardingTab>('overview');
    const [assigneeOpen, setAssigneeOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);

    // Fetch real data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/admin/franchisors');
                if (response.ok) {
                    const franchisors = await response.json();
                    const franchisor = franchisors.find((f: any) => f.id === requestId);

                    if (franchisor) {
                        // Transform API data to page format
                        const statusMap: Record<string, string> = {
                            'PENDING': 'submitted',
                            'APPROVED': 'approved',
                            'REJECTED': 'rejected',
                        };

                        const createdDate = new Date(franchisor.createdAt);
                        const now = new Date();
                        const diffHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
                        const age = diffHours < 24 ? `${diffHours} hours` : `${Math.floor(diffHours / 24)} days`;

                        setRequest({
                            id: franchisor.id,
                            status: statusMap[franchisor.approvalStatus] || 'submitted',
                            type: franchisor.businessType === 'BRAND_FRANCHISOR' ? 'Brand / Franchisor' : 'Multi-Store Owner',
                            age,
                            submittedBy: franchisor.owner?.name || 'Unknown',
                            submittedAt: new Date(franchisor.createdAt).toLocaleDateString(),
                            assignedAgent: null,
                            notes: '',
                            business: {
                                name: franchisor.businessName || franchisor.name || 'Unknown Business',
                                type: franchisor.industryType?.toLowerCase() || 'retail',
                                owner: franchisor.owner?.name || franchisor.name || 'Unknown',
                                email: franchisor.owner?.email || '',
                                phone: franchisor.phone || franchisor.owner?.phone || '',
                            },
                            locations: franchisor.franchises?.[0]?.locations?.map((l: any) => ({
                                id: l.id,
                                name: l.name,
                                address: `${l.address || ''}, ${l.city || ''}, ${l.state || ''} ${l.zipCode || ''}`,
                                created: true,
                                terminals: l.stations?.length || 0,
                            })) || [],
                            documents: [
                                { id: 'doc1', name: 'Driver License', status: franchisor.driverLicenseUrl ? 'verified' : 'missing', uploadedAt: franchisor.driverLicenseUrl ? 'Uploaded' : null },
                                { id: 'doc2', name: 'Voided Check', status: franchisor.voidCheckUrl ? 'verified' : 'missing', uploadedAt: franchisor.voidCheckUrl ? 'Uploaded' : null },
                                { id: 'doc3', name: 'FEIN Letter', status: franchisor.feinLetterUrl ? 'verified' : (franchisor.needToDiscussProcessing ? 'pending' : 'missing'), uploadedAt: franchisor.feinLetterUrl ? 'Uploaded' : null },
                            ],
                            devices: [],
                            checklist: {
                                businessReviewed: true,
                                docsVerified: !!(franchisor.driverLicenseUrl && franchisor.voidCheckUrl),
                                franchiseCreated: franchisor.franchises?.length > 0,
                                locationsCreated: franchisor.franchises?.[0]?.locations?.length > 0,
                                devicesAssigned: false,
                                shipmentCreated: false,
                                activated: franchisor.accountStatus === 'ACTIVE',
                            },
                            timeline: [
                                { id: 1, event: 'Request submitted', user: franchisor.owner?.name || 'Unknown', time: age + ' ago' },
                            ],
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching onboarding data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [requestId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="text-center py-20">
                <AlertCircle size={48} className="mx-auto text-stone-600 mb-4" />
                <h2 className="text-lg font-semibold text-stone-100">Request not found</h2>
                <p className="text-stone-400 mt-2">The onboarding request could not be found.</p>
                <Link href="/provider/onboarding" className="inline-block mt-4 text-orange-400 hover:underline">
                    Back to Onboarding
                </Link>
            </div>
        );
    }

    const tabs: { id: OnboardingTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'business', label: 'Business & Locations', icon: Building2 },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'hardware', label: 'Hardware & Terminals', icon: HardDrive },
        { id: 'shipping', label: 'Shipping', icon: Truck },
        { id: 'activation', label: 'Activation', icon: Play },
        { id: 'timeline', label: 'Timeline', icon: Clock },
    ];

    const statusColors: Record<string, string> = {
        'in-review': 'bg-purple-500/20 text-purple-400',
        submitted: 'bg-blue-500/20 text-blue-400',
        'waiting-docs': 'bg-amber-500/20 text-amber-400',
        approved: 'bg-emerald-500/20 text-emerald-400',
        shipped: 'bg-cyan-500/20 text-cyan-400',
    };

    return (
        <div>
            {/* Breadcrumb */}
            <Link href="/provider/onboarding" className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 mb-4">
                <ArrowLeft size={16} />
                Back to Onboarding Queue
            </Link>

            {/* Sticky Header */}
            <div className="sticky top-14 z-20 -mx-6 px-6 py-4 bg-stone-950/95 backdrop-blur border-b border-stone-800 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-stone-100 font-mono">{request.id}</h1>
                        <span className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${statusColors[request.status]}`}>
                            {request.status.replace('-', ' ')}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-stone-500">
                            <Clock size={14} />
                            {request.age}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Assign Agent Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setAssigneeOpen(!assigneeOpen)}
                                className="flex items-center gap-2 px-3 py-2 border border-stone-700 rounded-lg text-sm text-stone-300 hover:bg-stone-800"
                            >
                                <User size={14} />
                                {request.assignedAgent}
                                <ChevronDown size={14} />
                            </button>
                            {assigneeOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setAssigneeOpen(false)} />
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-20 py-1">
                                        {['Sarah M.', 'John D.', 'Unassigned'].map((agent) => (
                                            <button key={agent} className="w-full px-4 py-2 text-left text-sm text-stone-300 hover:bg-stone-700">
                                                {agent}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <button className="px-3 py-2 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 rounded-lg text-sm font-medium">
                            Request Docs
                        </button>
                        <button className="px-3 py-2 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-sm font-medium">
                            Approve
                        </button>
                        <button className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                            Create Shipment
                        </button>
                        <button className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium">
                            Mark Active
                        </button>
                        <button className="p-2 border border-stone-700 text-stone-400 hover:bg-stone-800 rounded-lg">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-stone-800 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'text-orange-400 border-b-2 border-orange-500'
                            : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Left - Request Summary */}
                    <div className="col-span-2 space-y-6">
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <h3 className="font-medium text-stone-100 mb-3">Request Summary</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-stone-500">Type</p>
                                    <p className="text-stone-200">{request.type}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">Submitted By</p>
                                    <p className="text-stone-200">{request.submittedBy}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">Submitted</p>
                                    <p className="text-stone-200">{request.submittedAt}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">Business Type</p>
                                    <p className="text-stone-200 capitalize">{request.business.type}</p>
                                </div>
                            </div>
                            {request.notes && (
                                <div className="mt-4 pt-4 border-t border-stone-800">
                                    <p className="text-stone-500 text-sm">Notes</p>
                                    <p className="text-stone-300 text-sm mt-1">{request.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <h3 className="font-medium text-stone-100 mb-3">Requested Locations ({request.locations.length})</h3>
                            <div className="space-y-3">
                                {request.locations.map((loc: { id: string; name: string; address: string; terminals: number; created: boolean }) => (
                                    <div key={loc.id} className="flex items-center justify-between p-3 border border-stone-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <MapPin size={18} className="text-stone-500" />
                                            <div>
                                                <p className="text-stone-200 font-medium">{loc.name}</p>
                                                <p className="text-stone-500 text-sm">{loc.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-stone-400 text-sm">{loc.terminals} terminals</span>
                                            {loc.created ? (
                                                <span className="text-emerald-400 text-xs flex items-center gap-1">
                                                    <CheckCircle size={12} /> Created
                                                </span>
                                            ) : (
                                                <span className="text-amber-400 text-xs">Pending</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right - Checklist */}
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Onboarding Checklist</h3>
                        <div className="space-y-3">
                            {Object.entries(request.checklist as Record<string, boolean>).map(([key, done]) => (
                                <div key={key} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500' : 'bg-stone-700'}`}>
                                        {done && <CheckCircle size={12} className="text-white" />}
                                    </div>
                                    <span className={`text-sm capitalize ${done ? 'text-stone-300' : 'text-stone-500'}`}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'business' && (
                <div className="space-y-6">
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-stone-100">Business Information</h3>
                            <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm">
                                Create Franchise
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Business Name</label>
                                <input type="text" defaultValue={request.business.name} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Business Type</label>
                                <select defaultValue={request.business.type} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200">
                                    <option value="retail">Retail</option>
                                    <option value="salon">Salon</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Owner Name</label>
                                <input type="text" defaultValue={request.business.owner} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Email</label>
                                <input type="email" defaultValue={request.business.email} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-stone-100">Locations</h3>
                            <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm">
                                Create All Locations
                            </button>
                        </div>
                        <div className="space-y-4">
                            {request.locations.map((loc: { id: string; name: string; address: string; terminals: number; created: boolean }) => (
                                <div key={loc.id} className="p-4 border border-stone-700 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium text-stone-200">{loc.name}</h4>
                                        {loc.created ? (
                                            <span className="text-emerald-400 text-xs flex items-center gap-1">
                                                <CheckCircle size={12} /> Created
                                            </span>
                                        ) : (
                                            <button className="px-2 py-1 border border-orange-500/50 text-orange-400 rounded text-xs">
                                                Create Location
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-stone-500 text-sm">{loc.address}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-stone-100">Required Documents</h3>
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-amber-500/50 text-amber-400 rounded text-sm">
                            <Mail size={14} /> Send Doc Request
                        </button>
                    </div>
                    <div className="space-y-3">
                        {request.documents.map((doc: { id: string; name: string; status: string; uploadedAt: string | null }) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border border-stone-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText size={18} className="text-stone-500" />
                                    <div>
                                        <p className="text-stone-200">{doc.name}</p>
                                        {doc.uploadedAt && <p className="text-stone-600 text-xs">Uploaded {doc.uploadedAt}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {doc.status === 'verified' && (
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs flex items-center gap-1">
                                            <CheckCircle size={12} /> Verified
                                        </span>
                                    )}
                                    {doc.status === 'uploaded' && (
                                        <>
                                            <button className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs">Verify</button>
                                            <button className="px-2 py-1 border border-red-500/30 text-red-400 rounded text-xs">Reject</button>
                                        </>
                                    )}
                                    {doc.status === 'missing' && (
                                        <>
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Missing</span>
                                            <button className="px-2 py-1 border border-stone-600 text-stone-400 rounded text-xs">
                                                <Upload size={12} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'hardware' && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Available Inventory</h3>
                        <div className="space-y-2">
                            {['PAX-009001', 'PAX-009002', 'PAX-009003'].map((serial) => (
                                <div key={serial} className="flex items-center justify-between p-2 border border-stone-700 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <HardDrive size={14} className="text-stone-500" />
                                        <span className="font-mono text-stone-300 text-sm">{serial}</span>
                                    </div>
                                    <button className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs">
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Assigned Devices</h3>
                        {request.locations.map((loc: { id: string; name: string; address: string; terminals: number; created: boolean }) => (
                            <div key={loc.id} className="mb-4">
                                <p className="text-stone-400 text-sm mb-2">{loc.name}</p>
                                <div className="space-y-2">
                                    {request.devices.filter((d: { assignedTo: string }) => d.assignedTo === loc.name).map((dev: { id: string; serial: string; model: string; assignedTo: string }) => (
                                        <div key={dev.id} className="flex items-center justify-between p-2 border border-stone-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Wifi size={14} className="text-emerald-400" />
                                                <span className="font-mono text-stone-300 text-sm">{dev.serial}</span>
                                                <span className="text-stone-600 text-xs">{dev.model}</span>
                                            </div>
                                            <button className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'shipping' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <h3 className="font-medium text-stone-100 mb-4">Create Shipment</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-stone-500 mb-1">Shipping Address</label>
                            <textarea className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" rows={3} defaultValue={request.locations[0].address} />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-500 mb-1">Carrier</label>
                            <select className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200 mb-3">
                                <option>UPS</option>
                                <option>FedEx</option>
                                <option>USPS</option>
                            </select>
                            <label className="block text-sm text-stone-500 mb-1">Tracking Number</label>
                            <input type="text" placeholder="Enter tracking #" className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-stone-800">
                        <h4 className="text-stone-300 text-sm mb-3">Devices in Shipment</h4>
                        <div className="flex gap-2 flex-wrap">
                            {request.devices.map((dev: { id: string; serial: string; model: string; assignedTo: string }) => (
                                <span key={dev.id} className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300">
                                    {dev.serial}
                                </span>
                            ))}
                        </div>
                        <button className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                            Create Shipment
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'activation' && (
                <div className="space-y-6">
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Create Owner User</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Owner Name</label>
                                <input type="text" defaultValue={request.business.owner} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-500 mb-1">Email</label>
                                <input type="email" defaultValue={request.business.email} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                        </div>
                        <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">
                            Send Magic Link
                        </button>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Enable Modules</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {['Inventory', 'Lottery', 'Age Verification', 'Appointments', 'Gift Cards', 'Loyalty'].map((mod) => (
                                <label key={mod} className="flex items-center gap-2 p-3 border border-stone-700 rounded-lg cursor-pointer hover:border-orange-500/50">
                                    <input type="checkbox" className="rounded bg-stone-800 border-stone-600" defaultChecked={mod === 'Inventory'} />
                                    <span className="text-stone-300 text-sm">{mod}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                        <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                        <h3 className="text-lg font-semibold text-stone-100">Ready to Activate</h3>
                        <p className="text-stone-400 text-sm mt-2 mb-4">All requirements met. Click below to activate this account.</p>
                        <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium">
                            Mark Active
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'timeline' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <h3 className="font-medium text-stone-100 mb-4">Timeline</h3>
                    <div className="space-y-4">
                        {request.timeline.map((event: { id: number; event: string; user: string; time: string }, i: number) => (
                            <div key={event.id} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    {i < request.timeline.length - 1 && <div className="w-0.5 h-full bg-stone-700 mt-1" />}
                                </div>
                                <div className="pb-4">
                                    <p className="text-stone-200">{event.event}</p>
                                    <p className="text-stone-500 text-sm">by {event.user} • {event.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
