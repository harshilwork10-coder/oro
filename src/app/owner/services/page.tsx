'use client';

import { Scissors, ArrowLeft, Wrench } from 'lucide-react';
import Link from 'next/link';

export default function ServicesPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6">
                <Scissors className="h-8 w-8 text-pink-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Service Menu — Coming Soon
            </h1>
            <p className="text-[var(--text-secondary)] max-w-md mb-2">
                Service menu management for this portal is being built.
            </p>
            <p className="text-[var(--text-muted)] text-sm max-w-md mb-8">
                You can manage services from the Booking Setup wizard or the ORO Buddy app.
            </p>
            <div className="flex items-center gap-3">
                <Link
                    href="/owner"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </Link>
            </div>
            <div className="mt-10 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Wrench size={12} />
                <span>This page will display real service data once connected</span>
            </div>
        </div>
    );
}
