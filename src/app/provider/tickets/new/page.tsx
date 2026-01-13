'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Ticket, AlertCircle, User, MessageSquare, Loader2, CheckCircle
} from 'lucide-react';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Category = 'HARDWARE' | 'SOFTWARE' | 'BILLING' | 'ONBOARDING' | 'OTHER';

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        clientId: '',
        clientName: '',
        subject: '',
        description: '',
        priority: 'MEDIUM' as Priority,
        category: 'OTHER' as Category,
    });

    // Mock clients for dropdown - in real app, fetch from API
    const mockClients = [
        { id: 'cmk9e643b000niqlj7x3utr96', name: 'test' },
        { id: 'client-2', name: 'Demo Salon' },
        { id: 'client-3', name: 'Quick Mart' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/provider/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/provider/tickets');
                }, 1500);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create ticket');
            }
        } catch (err) {
            setError('Error creating ticket');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mb-2">Ticket Created!</h2>
                    <p className="text-stone-400">Redirecting to tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/provider/tickets"
                    className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-200 mb-4 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Tickets
                </Link>
                <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-3">
                    <Ticket className="text-orange-500" />
                    New Support Ticket
                </h1>
                <p className="text-stone-400 mt-1">Create a new support ticket for a client</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6 space-y-5">
                    {/* Client Selection */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            <User size={14} className="inline mr-2" />
                            Client
                        </label>
                        <select
                            value={formData.clientId}
                            onChange={(e) => {
                                const client = mockClients.find(c => c.id === e.target.value);
                                setFormData(prev => ({
                                    ...prev,
                                    clientId: e.target.value,
                                    clientName: client?.name || ''
                                }));
                            }}
                            required
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                        >
                            <option value="">Select a client...</option>
                            {mockClients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            required
                            placeholder="Brief description of the issue..."
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                        />
                    </div>

                    {/* Category & Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                            >
                                <option value="HARDWARE">Hardware</option>
                                <option value="SOFTWARE">Software</option>
                                <option value="BILLING">Billing</option>
                                <option value="ONBOARDING">Onboarding</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            <MessageSquare size={14} className="inline mr-2" />
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            required
                            rows={5}
                            placeholder="Detailed description of the issue..."
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none"
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <Link
                        href="/provider/tickets"
                        className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors border border-stone-700 text-center"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Ticket size={18} />
                                Create Ticket
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
