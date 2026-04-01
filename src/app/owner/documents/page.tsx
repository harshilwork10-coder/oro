'use client';

import { FileText, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function DocumentsPage() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Documents</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Licenses, permits, and business files</p>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 flex flex-col items-center text-center max-w-lg mx-auto mt-8 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <FileText size={32} className="text-[var(--primary)]" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Document Vault Coming Soon</h2>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                        Securely store your business licenses, permits, insurance certificates,
                        tax documents, and employee files — all in one place.
                    </p>
                </div>

                <div className="w-full border-t border-[var(--border)] pt-5 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <Lock size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <span>Encrypted storage with franchise-scoped access control</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <span>Upload PDFs, images, and signed contracts</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <Mail size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <span>Expiry reminders for licenses and insurance policies</span>
                    </div>
                </div>

                <Link
                    href="/owner/support"
                    className="w-full py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors"
                >
                    Contact support to request early access
                </Link>
            </div>
        </div>
    );
}
