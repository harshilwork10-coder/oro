'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Search, Upload, FileText, Users, FolderTree,
    Package, CheckCircle, XCircle, AlertCircle, Loader2,
    ChevronRight, Building2, ArrowRight, RotateCcw
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'select-client' | 'select-type' | 'upload' | 'confirm';

type DataType = 'products' | 'customers' | 'departments';

interface FranchiseOption {
    id: string;
    name: string;
    itemCount: number;
    clientCount: number;
    departmentCount: number;
}

interface ClientOption {
    id: string;
    name: string;
    businessType: string;
    accountStatus: string;
    ownerName: string;
    ownerEmail: string;
    franchises: FranchiseOption[];
}

interface ImportResult {
    success: boolean;
    message: string;
    totalRows: number;
    created: number;
    updated?: number;
    skipped: number;
    errors: string[];
}

// ── Data Type Configs ────────────────────────────────────────────────────────

const DATA_TYPES: { id: DataType; label: string; icon: typeof Package; description: string; columns: string }[] = [
    {
        id: 'products',
        label: 'Products / Inventory',
        icon: Package,
        description: 'Import product catalog with UPC, name, cost, price, stock, and department',
        columns: 'UPC, Name, Cost, Price, Stock, Department',
    },
    {
        id: 'customers',
        label: 'Customers',
        icon: Users,
        description: 'Import customer list with name, email, phone. Duplicates auto-skipped.',
        columns: 'First Name, Last Name (or Full Name), Email, Phone',
    },
    {
        id: 'departments',
        label: 'Departments / Categories',
        icon: FolderTree,
        description: 'Import department/category structure. Existing departments are skipped.',
        columns: 'Name, Description',
    },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DataImportPage() {
    const [step, setStep] = useState<Step>('select-client');
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
    const [selectedFranchise, setSelectedFranchise] = useState<FranchiseOption | null>(null);
    const [selectedType, setSelectedType] = useState<DataType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch clients on mount and search
    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients(search?: string) {
        setIsSearching(true);
        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await fetch(`/api/provider/data-import/clients${params}`);
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (e) {
            console.error('Failed to fetch clients:', e);
        } finally {
            setIsSearching(false);
        }
    }

    function handleSearch(value: string) {
        setSearchQuery(value);
        fetchClients(value);
    }

    function selectClient(client: ClientOption) {
        setSelectedClient(client);
        if (client.franchises.length === 1) {
            setSelectedFranchise(client.franchises[0]);
            setStep('select-type');
        }
        // If multiple franchises, user clicks the one they want
    }

    function selectFranchise(franchise: FranchiseOption) {
        setSelectedFranchise(franchise);
        setStep('select-type');
    }

    function selectDataType(type: DataType) {
        setSelectedType(type);
        setStep('upload');
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
            setFile(droppedFile);
        }
    }

    async function executeImport() {
        if (!file || !selectedFranchise || !selectedType) return;

        setIsImporting(true);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('franchiseId', selectedFranchise.id);

            let url = '';
            if (selectedType === 'products') {
                // Step 1: Parse CSV
                const parseRes = await fetch('/api/inventory/import', {
                    method: 'POST',
                    body: formData,
                });
                if (!parseRes.ok) {
                    const err = await parseRes.json();
                    throw new Error(err.error || 'Failed to parse file');
                }
                const parsed = await parseRes.json();

                // Step 2: Enrich with master UPC database (auto-fills name, brand, size, category)
                let enrichedItems = parsed.items;
                try {
                    const enrichRes = await fetch('/api/inventory/owner-enrich', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: parsed.items }),
                    });
                    if (enrichRes.ok) {
                        const enrichData = await enrichRes.json();
                        enrichedItems = enrichData.items;
                        console.log(`[Import] Enriched ${enrichData.enrichedCount}/${enrichData.totalItems} items from master DB`);
                    }
                } catch (e) {
                    console.warn('[Import] Enrichment failed, proceeding with raw data:', e);
                }

                // Step 3: Confirm import — save to DB
                const confirmRes = await fetch('/api/inventory/import-confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: enrichedItems,
                        updateExisting: true,
                        franchiseId: selectedFranchise.id,
                    }),
                });
                if (!confirmRes.ok) {
                    const err = await confirmRes.json();
                    throw new Error(err.error || 'Failed to import products');
                }
                const result = await confirmRes.json();
                setImportResult(result);
                setStep('confirm');
                return;
            } else if (selectedType === 'customers') {
                url = '/api/provider/data-import/customers';
            } else if (selectedType === 'departments') {
                url = '/api/provider/data-import/departments';
            }

            const res = await fetch(url, { method: 'POST', body: formData });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Import failed');
            }

            setImportResult(result);
            setStep('confirm');
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setIsImporting(false);
        }
    }

    function resetWizard() {
        setStep('select-client');
        setSelectedClient(null);
        setSelectedFranchise(null);
        setSelectedType(null);
        setFile(null);
        setImportResult(null);
    }

    // ── Breadcrumb ───────────────────────────────────────────────────────────

    const steps: { id: Step; label: string }[] = [
        { id: 'select-client', label: 'Select Client' },
        { id: 'select-type', label: 'Data Type' },
        { id: 'upload', label: 'Upload CSV' },
        { id: 'confirm', label: 'Results' },
    ];

    const stepIndex = steps.findIndex(s => s.id === step);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/provider" className="p-2 hover:bg-stone-800 rounded-lg">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Client Data Import</h1>
                    <p className="text-stone-400 text-sm">Import products, customers, or departments for a client migrating from another POS</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-8 bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                        <button
                            onClick={() => i < stepIndex && setStep(s.id)}
                            disabled={i >= stepIndex}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${i === stepIndex ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                    i < stepIndex ? 'bg-stone-800 text-stone-300 hover:bg-stone-700 cursor-pointer' :
                                        'bg-stone-900 text-stone-600'}`}
                        >
                            {i < stepIndex ? <CheckCircle size={14} className="text-emerald-400" /> : null}
                            {s.label}
                        </button>
                        {i < steps.length - 1 && <ChevronRight size={14} className="text-stone-600" />}
                    </div>
                ))}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`mb-4 p-3 rounded-lg border text-sm ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'}`}>
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
                </div>
            )}

            {/* ── Step 1: Select Client ────────────────────────────────────────── */}
            {step === 'select-client' && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search by business name, owner name, or email..."
                            className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 animate-spin" />}
                    </div>

                    {/* Client List */}
                    <div className="space-y-2">
                        {clients.length === 0 && !isSearching && (
                            <div className="text-center py-12 text-stone-500">
                                <Building2 size={48} className="mx-auto mb-3 opacity-30" />
                                <p>No clients found</p>
                            </div>
                        )}
                        {clients.map(client => (
                            <div key={client.id} className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden">
                                <button
                                    onClick={() => selectClient(client)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-stone-800/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-stone-100 font-medium">{client.name}</p>
                                            <p className="text-stone-500 text-sm">{client.ownerName} · {client.ownerEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${client.accountStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {client.accountStatus}
                                        </span>
                                        <span className="text-stone-500 text-xs">{client.businessType}</span>
                                        <ChevronRight size={16} className="text-stone-600" />
                                    </div>
                                </button>

                                {/* Expanded: show franchises if this client is selected and has multiple */}
                                {selectedClient?.id === client.id && client.franchises.length > 1 && (
                                    <div className="border-t border-stone-800 px-4 py-3 bg-stone-800/30 space-y-2">
                                        <p className="text-stone-400 text-xs font-medium uppercase tracking-wide mb-2">Select a store:</p>
                                        {client.franchises.map(fr => (
                                            <button
                                                key={fr.id}
                                                onClick={() => selectFranchise(fr)}
                                                className="w-full flex items-center justify-between p-3 bg-stone-900/50 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors text-left"
                                            >
                                                <div>
                                                    <p className="text-stone-200 text-sm font-medium">{fr.name}</p>
                                                    <p className="text-stone-500 text-xs">{fr.itemCount} products · {fr.clientCount} customers · {fr.departmentCount} departments</p>
                                                </div>
                                                <ArrowRight size={14} className="text-stone-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Step 2: Select Data Type ─────────────────────────────────────── */}
            {step === 'select-type' && (
                <div className="space-y-4">
                    {/* Selected client summary */}
                    <div className="p-4 bg-stone-900/50 rounded-xl border border-stone-800 flex items-center gap-3">
                        <Building2 size={20} className="text-orange-400" />
                        <div>
                            <p className="text-stone-200 font-medium">{selectedClient?.name}</p>
                            <p className="text-stone-500 text-sm">Store: {selectedFranchise?.name} · {selectedFranchise?.itemCount} products · {selectedFranchise?.clientCount} customers</p>
                        </div>
                    </div>

                    <h2 className="text-lg font-semibold text-stone-100">What data are you importing?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {DATA_TYPES.map(dt => {
                            const Icon = dt.icon;
                            return (
                                <button
                                    key={dt.id}
                                    onClick={() => selectDataType(dt.id)}
                                    className="p-6 bg-stone-900/50 rounded-xl border border-stone-800 hover:border-orange-500/50 hover:bg-stone-800/50 transition-all text-left group"
                                >
                                    <Icon size={28} className="text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-stone-100 font-semibold mb-1">{dt.label}</h3>
                                    <p className="text-stone-500 text-sm mb-3">{dt.description}</p>
                                    <div className="flex items-center gap-1 text-xs text-stone-600">
                                        <FileText size={12} />
                                        CSV columns: {dt.columns}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Step 3: Upload CSV ───────────────────────────────────────────── */}
            {step === 'upload' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Context bar */}
                    <div className="p-4 bg-stone-900/50 rounded-xl border border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Building2 size={18} className="text-orange-400" />
                            <span className="text-stone-300 text-sm">{selectedClient?.name}</span>
                            <ChevronRight size={14} className="text-stone-600" />
                            <span className="text-orange-400 text-sm font-medium">
                                {DATA_TYPES.find(d => d.id === selectedType)?.label}
                            </span>
                        </div>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer
                            ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-stone-700 hover:border-orange-500/50 bg-stone-900/30'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {file ? (
                            <>
                                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                                <p className="text-stone-100 font-medium text-lg">{file.name}</p>
                                <p className="text-stone-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                            </>
                        ) : (
                            <>
                                <Upload size={48} className="mx-auto text-stone-600 mb-4" />
                                <p className="text-stone-300 font-medium">Drop your CSV file here</p>
                                <p className="text-stone-500 text-sm mt-1">or click to browse</p>
                                <p className="text-stone-600 text-xs mt-4">
                                    Expected columns: {DATA_TYPES.find(d => d.id === selectedType)?.columns}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-amber-400 text-sm font-medium mb-2">💡 Tips for a smooth import:</p>
                        <ul className="text-stone-400 text-sm space-y-1">
                            <li>• Export from your old POS as CSV (Comma-Separated Values)</li>
                            <li>• Column headers are auto-detected — exact names don&apos;t matter</li>
                            <li>• Duplicates (same UPC/email/phone) are automatically skipped</li>
                            <li>• You can re-run the import — it won&apos;t create duplicate records</li>
                        </ul>
                    </div>

                    {/* Import button */}
                    <button
                        onClick={executeImport}
                        disabled={!file || isImporting}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Import {DATA_TYPES.find(d => d.id === selectedType)?.label}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── Step 4: Results ──────────────────────────────────────────────── */}
            {step === 'confirm' && importResult && (
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Success banner */}
                    <div className={`p-6 rounded-2xl border text-center ${importResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        {importResult.success ? (
                            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
                        ) : (
                            <XCircle size={48} className="mx-auto text-red-400 mb-3" />
                        )}
                        <h2 className="text-xl font-bold text-stone-100">{importResult.message}</h2>
                        <p className="text-stone-400 text-sm mt-1">
                            Into {selectedClient?.name} → {selectedFranchise?.name}
                        </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{importResult.created}</div>
                            <div className="text-xs text-stone-400 mt-1">Created</div>
                        </div>
                        {importResult.updated !== undefined && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">{importResult.updated}</div>
                                <div className="text-xs text-stone-400 mt-1">Updated</div>
                            </div>
                        )}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
                            <div className="text-xs text-stone-400 mt-1">Skipped</div>
                        </div>
                        {importResult.errors.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-red-400">{importResult.errors.length}</div>
                                <div className="text-xs text-stone-400 mt-1">Errors</div>
                            </div>
                        )}
                    </div>

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <h3 className="text-stone-300 font-medium mb-2 flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-400" />
                                Errors ({importResult.errors.length})
                            </h3>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {importResult.errors.map((err, i) => (
                                    <p key={i} className="text-red-400 text-xs font-mono">{err}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={resetWizard}
                            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <RotateCcw size={16} />
                            Import More Data
                        </button>
                        <Link
                            href="/provider"
                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors text-center"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
