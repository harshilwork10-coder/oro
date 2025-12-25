'use client';

import { HelpCircle, MessageSquare, FileText, Phone } from 'lucide-react';

export default function EmployeeHelpPage() {
    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">Help & Support</h1>

            <div className="space-y-4">
                <a
                    href="/employee/help/chat"
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-colors"
                >
                    <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                        <MessageSquare size={24} className="text-[var(--primary)]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">Live Chat</h3>
                        <p className="text-sm text-[var(--text-muted)]">Chat with support team</p>
                    </div>
                </a>

                <a
                    href="/employee/help/docs"
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-colors"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FileText size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Base</h3>
                        <p className="text-sm text-[var(--text-muted)]">Browse help articles</p>
                    </div>
                </a>

                <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Phone size={24} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">Call Support</h3>
                        <p className="text-sm text-[var(--primary)]">1-800-555-0123</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
