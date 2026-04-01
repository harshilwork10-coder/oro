'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import { HQ_ROLES, type HQRole } from '@/lib/hqRole';

interface HQAccessGuardProps {
    children: React.ReactNode;
    requiredCap?: keyof typeof HQ_ROLES['OWNER']; // e.g. 'canAccessSettings'
}

/**
 * HQAccessGuard — wraps a page and blocks access if the caller's HQ role
 * does not have the required capability. Used at the page level for hard blocks.
 *
 * Usage:
 *   export default function SettingsPage() {
 *     return (
 *       <HQAccessGuard requiredCap="canAccessSettings">
 *         ... content ...
 *       </HQAccessGuard>
 *     );
 *   }
 */
export function HQAccessGuard({ children, requiredCap }: HQAccessGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [hqRole, setHqRole] = useState<HQRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/franchisor/my-role')
            .then(r => r.ok ? r.json() : null)
            .then(data => setHqRole((data?.hqRole as HQRole) || 'VIEWER'))
            .catch(() => setHqRole('VIEWER'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return null; // Don't flash blocked state

    if (hqRole && requiredCap) {
        const roleDef = HQ_ROLES[hqRole];
        const allowed = roleDef ? (roleDef[requiredCap] as boolean) : false;
        if (!allowed) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-lg max-w-sm w-full">
                        <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Lock size={28} className="text-red-400" />
                        </div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Access Restricted</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Your HQ role <span className="font-semibold text-[var(--text-secondary)]">({HQ_ROLES[hqRole]?.label})</span> does not have permission to access this page.
                            Contact an HQ Owner to change your role.
                        </p>
                        <button
                            onClick={() => router.push('/franchisor/home')}
                            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-dark)] transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
