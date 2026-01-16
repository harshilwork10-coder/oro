'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Info } from 'lucide-react';

export default function ProviderClientEmployeesPage() {
    const params = useParams();
    const clientId = params.id as string;

    const [clientName, setClientName] = useState('');
    const [employeeCount, setEmployeeCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/admin/franchisors/${clientId}`);
                if (res.ok) {
                    const client = await res.json();
                    setClientName(client.name || 'Client');
                    // Count employees if available
                    setEmployeeCount(client._count?.employees || 0);
                }
            } catch (error) {
                console.error('Failed to fetch client:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [clientId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-900 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href={`/provider/clients/${clientId}/config`}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">Employees</h1>
                        <p className="text-stone-400 text-sm">{clientName}</p>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-8 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-500/10 rounded-2xl mb-4">
                        <Users className="h-8 w-8 text-blue-400" />
                    </div>

                    <h3 className="text-xl font-semibold text-stone-100 mb-2">
                        {employeeCount > 0
                            ? `${employeeCount} Employee${employeeCount > 1 ? 's' : ''} Registered`
                            : 'No Employees Yet'
                        }
                    </h3>

                    <p className="text-stone-400 mb-6 max-w-md mx-auto">
                        Employees are added and managed by the business owner through their dashboard.
                        As a provider, you can view employee count but cannot add or modify staff.
                    </p>

                    <div className="flex items-center justify-center gap-2 text-stone-500 text-sm bg-stone-800 rounded-xl px-4 py-3 max-w-sm mx-auto">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>The owner can manage employees at <strong>Dashboard → Employees</strong></span>
                    </div>
                </div>

                {/* Back Button */}
                <div className="mt-6 text-center">
                    <Link
                        href={`/provider/clients/${clientId}/config`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Configuration
                    </Link>
                </div>
            </div>
        </div>
    );
}
