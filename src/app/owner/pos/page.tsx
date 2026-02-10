'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Loader2, Store, Scissors } from 'lucide-react';

export default function OwnerPOSPage() {
    const router = useRouter();
    const [businessType, setBusinessType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Determine business type and redirect to appropriate POS
        fetch('/api/auth/status')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                const type = data?.memberships?.[0]?.franchisor?.businessType || 'SERVICE';
                setBusinessType(type);
                // Auto-redirect to the correct POS
                if (type === 'RETAIL') {
                    router.replace('/dashboard/pos/retail');
                } else {
                    router.replace('/dashboard/pos/salon');
                }
            })
            .catch(() => {
                // Fallback: show selection
                setLoading(false);
            });
    }, [router]);

    if (loading || businessType) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
                <p className="text-[var(--text-muted)]">Loading POS...</p>
            </div>
        );
    }

    // Fallback: manual selection
    return (
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Point of Sale</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <button
                    onClick={() => router.push('/dashboard/pos/salon')}
                    className="flex flex-col items-center gap-4 p-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] transition-all"
                >
                    <Scissors size={40} className="text-pink-400" />
                    <span className="font-semibold text-[var(--text-primary)]">Salon POS</span>
                    <span className="text-sm text-[var(--text-muted)]">Services & appointments</span>
                </button>
                <button
                    onClick={() => router.push('/dashboard/pos/retail')}
                    className="flex flex-col items-center gap-4 p-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] transition-all"
                >
                    <Store size={40} className="text-blue-400" />
                    <span className="font-semibold text-[var(--text-primary)]">Retail POS</span>
                    <span className="text-sm text-[var(--text-muted)]">Products & inventory</span>
                </button>
            </div>
        </div>
    );
}
