'use client';

import { ShoppingCart } from 'lucide-react';

export default function EmployeePOSPage() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <ShoppingCart size={64} className="mx-auto text-[var(--primary)] mb-4" />
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Point of Sale</h1>
                <p className="text-[var(--text-secondary)] mt-2">
                    The POS system is available at <code className="px-2 py-1 bg-[var(--surface)] rounded">/dashboard/pos</code>
                </p>
                <a
                    href="/dashboard/pos"
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-xl font-medium transition-colors"
                >
                    <ShoppingCart size={20} />
                    Open Full POS
                </a>
            </div>
        </div>
    );
}

