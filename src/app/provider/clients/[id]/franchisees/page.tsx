'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Store, Settings, Search, RefreshCw, MapPin } from 'lucide-react';

interface Franchisee {
    id: string;
    name: string;
    ownerName: string | null;
    ownerEmail: string | null;
    locationCount: number;
    status: string;
    createdAt: string;
}

interface BrandData {
    id: string;
    name: string;
}

export default function FranchiseesListPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: brandId } = use(params);
    const [brand, setBrand] = useState<BrandData | null>(null);
    const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, [brandId]);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch brand info
            const brandRes = await fetch(`/api/admin/franchisors/${brandId}`);
            if (brandRes.ok) {
                const data = await brandRes.json();
                setBrand({ id: data.id, name: data.name });
            }

            // Fetch franchisees for this brand
            const franchiseesRes = await fetch(`/api/admin/franchisors/${brandId}/franchisees`);
            if (franchiseesRes.ok) {
                const data = await franchiseesRes.json();
                setFranchisees(data.data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    }

    const filteredFranchisees = franchisees.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.ownerEmail?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw size={32} className="animate-spin text-[var(--text-muted)]" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href={`/provider/clients/${brandId}/config`}
                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"
                >
                    <ArrowLeft size={20} className="text-[var(--text-muted)]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        {brand?.name || 'Brand'} - Franchisees
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">{franchisees.length} franchisee(s)</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search franchisees..."
                        className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Franchisee Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFranchisees.map((f) => (
                    <div key={f.id} className="glass-panel rounded-xl border border-[var(--border)] p-4 hover:border-[var(--primary)]/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Building2 size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">{f.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{f.ownerEmail || 'No owner'}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                                    f.status === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-stone-500/20 text-stone-400'
                                }`}>
                                {f.status?.replace(/_/g, ' ')}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-4">
                            <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                {f.locationCount} location(s)
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Link
                                href={`/provider/clients/${f.id}/config`}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
                            >
                                <Settings size={16} />
                                Configure
                            </Link>
                            <Link
                                href={`/provider/clients/${f.id}`}
                                className="py-2 px-3 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--surface-hover)]"
                            >
                                Details
                            </Link>
                        </div>
                    </div>
                ))}

                {filteredFranchisees.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Store size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                        <p className="text-[var(--text-secondary)]">No franchisees found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
