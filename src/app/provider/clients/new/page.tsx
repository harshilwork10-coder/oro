'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Phone, Building2, DollarSign, Loader2, CheckCircle, Copy, Store } from 'lucide-react';
import Link from 'next/link';

export default function AddClientPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        supportFee: '0',
        businessType: 'MULTI_LOCATION_OWNER',
        industryType: 'RETAIL'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [magicLink, setMagicLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Format phone as (XXX) XXX-XXXX
    const handlePhoneChange = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const limited = digits.slice(0, 10);
        let formatted = '';
        if (limited.length > 0) {
            formatted = '(' + limited.slice(0, 3);
        }
        if (limited.length >= 3) {
            formatted += ') ' + limited.slice(3, 6);
        }
        if (limited.length >= 6) {
            formatted += '-' + limited.slice(6, 10);
        }
        setFormData({ ...formData, phone: formatted });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Basic validation
            if (!formData.name.trim() || !formData.email.trim() || !formData.companyName.trim()) {
                setError('Name, Email, and Company Name are required');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/admin/franchisors/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    type: formData.businessType === 'BRAND_FRANCHISOR' ? 'BRAND' : 'INDIVIDUAL',
                    billingMethod: 'DIRECT',
                    enableCommission: true,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create client');
            }

            setMagicLink(data.magicLink);

        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(magicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Success state - show magic link
    if (magicLink) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Invite Sent!</h1>
                    <p className="text-[var(--text-secondary)] mb-6">
                        An invite has been created for <strong className="text-[var(--text-primary)]">{formData.companyName}</strong>.
                        The client will complete their own onboarding when they click the link.
                    </p>

                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 mb-6">
                        <p className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Magic Link</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm text-emerald-400 font-mono truncate bg-stone-900/50 px-3 py-2 rounded">
                                {magicLink}
                            </code>
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium"
                            >
                                <Copy size={16} />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-stone-500 mt-3">
                            In production, this link is emailed automatically. For testing, copy and share it manually.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setMagicLink('');
                                setFormData({ name: '', email: '', phone: '', companyName: '', supportFee: '0', businessType: 'MULTI_LOCATION_OWNER', industryType: 'RETAIL' });
                            }}
                            className="flex-1 py-3 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg font-medium"
                        >
                            Add Another
                        </button>
                        <Link
                            href="/provider/clients"
                            className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-center"
                        >
                            View Clients
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/provider/clients" className="p-2 hover:bg-[var(--surface)] rounded-lg text-[var(--text-secondary)]">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Add New Client</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Send an invite link to a new client</p>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300">
                    <strong>How it works:</strong> Enter basic info below. The client will receive a magic link to complete their onboarding (business details, locations, documents).
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-6">
                {/* Owner Name */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Owner Name *</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            placeholder="John Smith"
                            required
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email Address *</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            placeholder="john@business.com"
                            required
                        />
                    </div>
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Cell Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            maxLength={14}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            placeholder="(555) 123-4567"
                        />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">For "Needs Call" processing setup</p>
                </div>

                {/* Company Name */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Company Name *</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            placeholder="ABC Liquor LLC"
                            required
                        />
                    </div>
                </div>

                {/* Business Type */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Business Type *</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { value: 'MULTI_LOCATION_OWNER', label: '🏢 Multi-Store Owner', desc: 'Own multiple store locations' },
                            { value: 'BRAND_FRANCHISOR', label: '🌐 Brand / Franchisor', desc: 'Brand with franchisees' },
                        ].map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, businessType: option.value })}
                                className={`p-4 rounded-lg border text-left transition-all ${formData.businessType === option.value
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border)] hover:border-stone-600'
                                    }`}
                            >
                                <span className="block text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
                                <span className="block text-xs text-stone-500">{option.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Industry Type */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Industry Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { value: 'RETAIL', label: '🏪 Retail', desc: 'Liquor, Convenience, Smoke' },
                            { value: 'SERVICE', label: '🎨 Service', desc: 'Salon, Spa, Barbershop' },
                        ].map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, industryType: option.value })}
                                className={`p-4 rounded-lg border text-left transition-all ${formData.industryType === option.value
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border)] hover:border-stone-600'
                                    }`}
                            >
                                <span className="block text-sm font-medium text-[var(--text-primary)]">{option.label}</span>
                                <span className="block text-xs text-stone-500">{option.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Monthly Fee */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly Support Fee</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                        <input
                            type="number"
                            value={formData.supportFee}
                            onChange={(e) => setFormData({ ...formData, supportFee: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Auto-calculated · Direct billing</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <Link
                        href="/provider/clients"
                        className="flex-1 py-3 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg font-medium text-center"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Sending...
                            </>
                        ) : (
                            'Send Invite'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
