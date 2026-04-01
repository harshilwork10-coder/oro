'use client';

/**
 * D1 — INVENTORY CANONICALIZATION
 * Canonical inventory hub is /dashboard/owner/inventory (Tree A).
 * This Tree B entry point redirects owners there while making the
 * handoff explicit — no silent 404, no mystery.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';

export default function OwnerInventoryRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect after a brief moment so the banner is visible on slow navigations
        const t = setTimeout(() => router.replace('/dashboard/owner/inventory'), 800);
        return () => clearTimeout(t);
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <Package className="w-10 h-10 text-[var(--primary)]" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    Redirecting to Inventory Hub…
                </h1>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                    Inventory is managed in your Owner Dashboard.
                    You'll be taken there automatically.
                </p>
            </div>
            <Link
                href="/dashboard/owner/inventory"
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-xl font-medium text-sm transition-colors"
            >
                Go to Inventory Hub <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
