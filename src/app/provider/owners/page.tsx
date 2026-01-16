'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User, Building2, Store, Search, ArrowRight,
    CheckCircle, Clock, XCircle, Mail
} from 'lucide-react';

interface OwnerData {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
    llcCount: number;
    storeCount: number;
    primaryLlc: string | null;
    memberships: {
        id: string;
        role: string;
        isPrimary: boolean;
        llcId: string;
        llcName: string;
        businessType: string;
        approvalStatus: string;
    }[];
}

export default function OwnersListPage() {
    const [owners, setOwners] = useState<OwnerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchOwners();
    }, []);

    async function fetchOwners() {
        try {
            const res = await fetch('/api/admin/owners');
            if (res.ok) {
                const data = await res.json();
                setOwners(data);
            }
        } catch (error) {
            console.error('Failed to fetch owners:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredOwners = owners.filter(owner =>
        owner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.primaryLlc?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    function getStatusBadge(memberships: OwnerData['memberships']) {
        // Check if any LLC is pending approval
        const hasPending = memberships.some(m => m.approvalStatus === 'PENDING');
        const hasRejected = memberships.some(m => m.approvalStatus === 'REJECTED');

        if (hasRejected) {
            return (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Issue
                </span>
            );
        }
        if (hasPending) {
            return (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Pending
                </span>
            );
        }
        return (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Active
            </span>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Owners</h1>
                    <p className="text-stone-400 text-sm">Business clients and their companies</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search owners by name, email, or business..."
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                />
            </div>

            {/* Empty State */}
            {filteredOwners.length === 0 ? (
                <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-12 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-amber-500/10 rounded-2xl mb-4">
                        <User className="h-8 w-8 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-100 mb-2">No Owners Found</h3>
                    <p className="text-stone-400 max-w-md mx-auto">
                        {searchQuery
                            ? 'No owners match your search criteria.'
                            : 'No business owners have been added yet.'}
                    </p>
                </div>
            ) : (
                /* Owners Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOwners.map((owner) => (
                        <Link
                            key={owner.id}
                            href={`/provider/owners/${owner.id}`}
                            className="group bg-stone-800/50 border border-stone-700 rounded-2xl p-5 hover:border-amber-500/50 hover:bg-stone-800 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                        {owner.image ? (
                                            <img src={owner.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                                        ) : (
                                            <User className="h-6 w-6 text-amber-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100 group-hover:text-amber-300 transition-colors">
                                            {owner.name || 'Unnamed Owner'}
                                        </h3>
                                        <p className="text-stone-500 text-sm flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {owner.email}
                                        </p>
                                    </div>
                                </div>
                                {getStatusBadge(owner.memberships)}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                                        <Building2 className="h-4 w-4" />
                                        <span className="text-lg font-bold">{owner.llcCount}</span>
                                    </div>
                                    <p className="text-stone-500 text-xs">Business{owner.llcCount !== 1 ? 'es' : ''}</p>
                                </div>
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                        <Store className="h-4 w-4" />
                                        <span className="text-lg font-bold">{owner.storeCount}</span>
                                    </div>
                                    <p className="text-stone-500 text-xs">Store{owner.storeCount !== 1 ? 's' : ''}</p>
                                </div>
                            </div>

                            {/* Primary LLC */}
                            {owner.primaryLlc && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-stone-500">Primary:</span>
                                    <span className="text-stone-300 font-medium">{owner.primaryLlc}</span>
                                </div>
                            )}

                            {/* Arrow */}
                            <div className="flex justify-end mt-3">
                                <ArrowRight className="h-5 w-5 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
