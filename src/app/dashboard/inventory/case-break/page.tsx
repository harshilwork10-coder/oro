'use client';

import Link from 'next/link';
import { ArrowLeft, Rocket } from 'lucide-react';

export default function CaseBreakPage() {
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <Rocket className="h-8 w-8 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Case Break</h1>
                <p className="text-stone-400 mb-6">
                    This feature is coming soon. Case-to-unit breaking will be available in a future update.
                </p>
                <Link href="/dashboard/inventory/retail" className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-stone-300 rounded-xl hover:bg-stone-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Inventory
                </Link>
            </div>
        </div>
    );
}
