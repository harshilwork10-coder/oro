'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Check, Users, MapPin,
    HardDrive, FileText, Store, Scissors, LayoutGrid
} from 'lucide-react';

type RequestType = 'franchisee' | 'location' | 'device-change';
type BusinessType = 'retail' | 'salon' | 'both';

interface FranchiseeInfo {
    legalName: string;
    dbaName: string;
    businessType: BusinessType;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
}

interface OwnerInfo {
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
}

interface LocationInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
}

interface HardwareInfo {
    locationId: string;
    registers: number;
    terminals: number;
    terminalType: string;
    notes: string;
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    const steps = ['Franchisee', 'Owner', 'Locations', 'Hardware', 'Documents', 'Review'];
    const displaySteps = steps.slice(0, totalSteps);

    return (
        <div className="flex items-center justify-center mb-8 overflow-x-auto py-2">
            {displaySteps.map((step, index) => (
                <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${index + 1 < currentStep
                        ? 'bg-emerald-500 text-white'
                        : index + 1 === currentStep
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                        }`}>
                        {index + 1 < currentStep ? <Check size={16} /> : index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium whitespace-nowrap ${index + 1 <= currentStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                        }`}>
                        {step}
                    </span>
                    {index < displaySteps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-3 ${index + 1 < currentStep ? 'bg-emerald-500' : 'bg-[var(--border)]'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

function NewRequestContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestType = (searchParams.get('type') as RequestType) || 'franchisee';

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = requestType === 'franchisee' ? 6 : requestType === 'location' ? 5 : 3;

    const [franchisee, setFranchisee] = useState<FranchiseeInfo>({
        legalName: '',
        dbaName: '',
        businessType: 'retail',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
    });

    const [owner, setOwner] = useState<OwnerInfo>({
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
    });

    const [locations, setLocations] = useState<LocationInfo[]>([
        { id: '1', name: '', address: '', city: '', state: '', zip: '', phone: '' }
    ]);

    const [hardware, setHardware] = useState<HardwareInfo[]>([
        { locationId: '1', registers: 1, terminals: 1, terminalType: '', notes: '' }
    ]);

    const addLocation = () => {
        const newId = Date.now().toString();
        setLocations([...locations, { id: newId, name: '', address: '', city: '', state: '', zip: '', phone: '' }]);
        setHardware([...hardware, { locationId: newId, registers: 1, terminals: 1, terminalType: '', notes: '' }]);
    };

    const handleSubmit = () => {
        // API submission pending integration
        // Request submitted to API;
        router.push('/franchisor/requests');
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    {requestType === 'franchisee' ? 'New Franchisee Request' :
                        requestType === 'location' ? 'Add Location Request' : 'Device Change Request'}
                </h1>
            </div>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

            {/* Step Content */}
            <div className="glass-panel rounded-xl border border-[var(--border)] p-6">

                {/* Step 1: Franchisee Info */}
                {currentStep === 1 && requestType === 'franchisee' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Franchisee Information</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Legal Business Name *</label>
                                <input
                                    type="text"
                                    value={franchisee.legalName}
                                    onChange={(e) => setFranchisee({ ...franchisee, legalName: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">DBA Name</label>
                                <input
                                    type="text"
                                    value={franchisee.dbaName}
                                    onChange={(e) => setFranchisee({ ...franchisee, dbaName: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>

                        {/* Business Type */}
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">Business Type *</label>
                            <div className="flex gap-3">
                                {[
                                    { type: 'retail', icon: Store, label: 'Retail' },
                                    { type: 'salon', icon: Scissors, label: 'Salon' },
                                    { type: 'both', icon: LayoutGrid, label: 'Both' },
                                ].map(({ type, icon: Icon, label }) => (
                                    <button
                                        key={type}
                                        onClick={() => setFranchisee({ ...franchisee, businessType: type as BusinessType })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${franchisee.businessType === type
                                            ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]'
                                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Contact Name *</label>
                                <input
                                    type="text"
                                    value={franchisee.contactName}
                                    onChange={(e) => setFranchisee({ ...franchisee, contactName: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={franchisee.contactPhone}
                                    onChange={(e) => setFranchisee({ ...franchisee, contactPhone: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={franchisee.contactEmail}
                                    onChange={(e) => setFranchisee({ ...franchisee, contactEmail: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Owner Info */}
                {currentStep === 2 && requestType === 'franchisee' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Owner/Principal Information</h2>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Owner Name *</label>
                                <input
                                    type="text"
                                    value={owner.ownerName}
                                    onChange={(e) => setOwner({ ...owner, ownerName: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={owner.ownerPhone}
                                    onChange={(e) => setOwner({ ...owner, ownerPhone: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={owner.ownerEmail}
                                    onChange={(e) => setOwner({ ...owner, ownerEmail: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Locations */}
                {((currentStep === 3 && requestType === 'franchisee') || (currentStep === 1 && requestType === 'location')) && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Locations</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Add at least one location.</p>

                        {locations.map((location, index) => (
                            <div key={location.id} className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-4">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-[var(--primary)]" />
                                    <span className="font-medium text-[var(--text-primary)]">Location {index + 1}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Location Name *</label>
                                        <input
                                            type="text"
                                            value={location.name}
                                            onChange={(e) => {
                                                const updated = [...locations];
                                                updated[index].name = e.target.value;
                                                setLocations(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={location.phone}
                                            onChange={(e) => {
                                                const updated = [...locations];
                                                updated[index].phone = e.target.value;
                                                setLocations(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Address *</label>
                                    <input
                                        type="text"
                                        value={location.address}
                                        onChange={(e) => {
                                            const updated = [...locations];
                                            updated[index].address = e.target.value;
                                            setLocations(updated);
                                        }}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">City *</label>
                                        <input
                                            type="text"
                                            value={location.city}
                                            onChange={(e) => {
                                                const updated = [...locations];
                                                updated[index].city = e.target.value;
                                                setLocations(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">State *</label>
                                        <input
                                            type="text"
                                            value={location.state}
                                            onChange={(e) => {
                                                const updated = [...locations];
                                                updated[index].state = e.target.value;
                                                setLocations(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">ZIP *</label>
                                        <input
                                            type="text"
                                            value={location.zip}
                                            onChange={(e) => {
                                                const updated = [...locations];
                                                updated[index].zip = e.target.value;
                                                setLocations(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addLocation}
                            className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/50 transition-colors"
                        >
                            + Add Another Location
                        </button>
                    </div>
                )}

                {/* Step 4: Hardware */}
                {((currentStep === 4 && requestType === 'franchisee') || (currentStep === 2 && requestType === 'location')) && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">POS/Hardware Needs</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Specify hardware requirements for each location.</p>

                        {locations.map((location, index) => (
                            <div key={location.id} className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-4">
                                <div className="flex items-center gap-2">
                                    <HardDrive size={16} className="text-[var(--primary)]" />
                                    <span className="font-medium text-[var(--text-primary)]">{location.name || `Location ${index + 1}`}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Registers/Stations</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={hardware[index]?.registers || 1}
                                            onChange={(e) => {
                                                const updated = [...hardware];
                                                if (updated[index]) updated[index].registers = parseInt(e.target.value) || 0;
                                                setHardware(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Payment Terminals</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={hardware[index]?.terminals || 1}
                                            onChange={(e) => {
                                                const updated = [...hardware];
                                                if (updated[index]) updated[index].terminals = parseInt(e.target.value) || 0;
                                                setHardware(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Terminal Type</label>
                                        <select
                                            value={hardware[index]?.terminalType || ''}
                                            onChange={(e) => {
                                                const updated = [...hardware];
                                                if (updated[index]) updated[index].terminalType = e.target.value;
                                                setHardware(updated);
                                            }}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        >
                                            <option value="">No preference</option>
                                            <option value="PAX A920">PAX A920</option>
                                            <option value="PAX A80">PAX A80</option>
                                            <option value="Dejavoo Z11">Dejavoo Z11</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Notes (tips, dual pricing, etc.)</label>
                                    <input
                                        type="text"
                                        value={hardware[index]?.notes || ''}
                                        onChange={(e) => {
                                            const updated = [...hardware];
                                            if (updated[index]) updated[index].notes = e.target.value;
                                            setHardware(updated);
                                        }}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        placeholder="e.g., Enable tips, dual pricing for cards"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 5: Documents */}
                {((currentStep === 5 && requestType === 'franchisee') || (currentStep === 3 && requestType === 'location')) && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Documents</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Upload any available documents or skip for now.</p>

                        <div className="p-8 border-2 border-dashed border-[var(--border)] rounded-lg text-center">
                            <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-secondary)]">Drag & drop files here or click to browse</p>
                            <p className="text-xs text-[var(--text-muted)] mt-2">Void check, ID, business license, etc.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="will-provide" className="rounded" />
                            <label htmlFor="will-provide" className="text-sm text-[var(--text-secondary)]">
                                Will provide documents later
                            </label>
                        </div>
                    </div>
                )}

                {/* Step 6: Review */}
                {((currentStep === 6 && requestType === 'franchisee') || (currentStep === 4 && requestType === 'location')) && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review & Submit</h2>

                        <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-4">
                            <div className="flex items-center gap-3">
                                <Users size={24} className="text-[var(--primary)]" />
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">{franchisee.dbaName || franchisee.legalName || 'New Franchisee'}</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">{franchisee.legalName}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                                <div>
                                    <span className="text-sm text-[var(--text-muted)]">Type</span>
                                    <p className="font-medium text-[var(--text-primary)] capitalize">{franchisee.businessType}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-[var(--text-muted)]">Owner</span>
                                    <p className="font-medium text-[var(--text-primary)]">{owner.ownerName || 'Not set'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-[var(--text-muted)]">Locations</span>
                                    <p className="font-medium text-[var(--text-primary)]">{locations.length}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-[var(--text-muted)]">Total Terminals</span>
                                    <p className="font-medium text-[var(--text-primary)]">{hardware.reduce((sum, h) => sum + h.terminals, 0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-sm text-amber-400">
                                ⚠️ After submitwp, this request will be sent to Provider for review and processing.
                                You can track the status in the Requests page.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-4 border-t border-[var(--border)]">
                    <button
                        onClick={currentStep === 1 ? () => router.back() : () => setCurrentStep(currentStep - 1)}
                        className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ChevronLeft size={18} />
                        {currentStep === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {currentStep < totalSteps ? (
                        <button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium transition-colors"
                        >
                            Next
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium transition-colors"
                        >
                            Submit Request
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function NewRequestPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" /></div>}>
            <NewRequestContent />
        </Suspense>
    );
}
