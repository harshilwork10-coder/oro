'use client';

import { Headphones, Phone, Mail, MessageSquare, ExternalLink } from 'lucide-react';

const FAQ_ITEMS = [
    { q: 'How do I reset an employee PIN?', a: 'Go to Employees → Select employee → Reset PIN' },
    { q: 'How do I enable dual pricing?', a: 'Contact your provider — this is a system-level feature flag' },
    { q: 'How do I pair a new POS terminal?', a: 'Go to Settings → Stations → Add Station, then use the pairing code shown on the terminal' },
    { q: 'How do I change my store theme?', a: 'Go to Settings → Appearance and choose a theme' },
    { q: 'How do I export my sales for accounting?', a: 'Go to Owner Dashboard → Acct Export to download a QuickBooks-compatible file' },
    { q: 'How do I close the month?', a: 'Go to Owner Dashboard → Month End to lock the period and generate final summaries' },
];

export default function SupportPage() {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Support</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Get help with your ORO POS system</p>
                </div>
            </div>

            {/* Contact Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <a
                    href="tel:+18556764357"
                    className="bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/40 rounded-xl p-4 flex items-center gap-3 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Phone size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">(855) ORO-HELP</p>
                        <p className="text-xs text-[var(--text-muted)]">Mon–Fri 9AM–6PM EST</p>
                    </div>
                </a>

                <a
                    href="mailto:support@oro9.com"
                    className="bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 rounded-xl p-4 flex items-center gap-3 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Mail size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">support@oro9.com</p>
                        <p className="text-xs text-[var(--text-muted)]">24h response guaranteed</p>
                    </div>
                </a>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)]">Live Chat</p>
                        <p className="text-xs text-[var(--text-muted)]">Available via mobile app</p>
                    </div>
                </div>
            </div>

            {/* Ticket System Notice */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-8 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Headphones size={20} className="text-amber-400" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Ticket Portal — Coming Soon</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Track, manage, and respond to support tickets directly in your portal.
                        In the meantime, email <a href="mailto:support@oro9.com" className="text-[var(--primary)] hover:underline">support@oro9.com</a> for any open issues — we'll reply within 24 hours.
                    </p>
                </div>
                <a
                    href="mailto:support@oro9.com"
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity flex-shrink-0"
                >
                    <Mail size={14} />
                    Email Us
                </a>
            </div>

            {/* FAQ */}
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                Frequently Asked Questions
            </h2>
            <div className="space-y-3">
                {FAQ_ITEMS.map((item, i) => (
                    <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                        <h3 className="font-medium text-[var(--text-primary)] mb-1">{item.q}</h3>
                        <p className="text-sm text-[var(--text-muted)]">{item.a}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
