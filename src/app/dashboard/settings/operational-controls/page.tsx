'use client';

import { useState, useEffect } from 'react';
import { Shield, DollarSign, Save, CheckCircle } from 'lucide-react';

export default function RefundThresholdsPage() {
    const [config, setConfig] = useState({ requireManagerPinAbove: '', refundLimitPerDay: '', allowNegativeStock: false, autoLockMinutes: '3' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch('/api/settings/operational-controls');
                if (res.ok) {
                    const data = await res.json();
                    setConfig({
                        requireManagerPinAbove: data.requireManagerPinAbove?.toString() || '',
                        refundLimitPerDay: data.refundLimitPerDay?.toString() || '',
                        allowNegativeStock: data.allowNegativeStock ?? false,
                        autoLockMinutes: data.autoLockMinutes?.toString() || '3'
                    });
                }
            } catch { /* ignore */ }
            setLoading(false);
        }
        fetchConfig();
    }, []);

    async function handleSave() {
        setSaving(true); setSaved(false);
        try {
            const res = await fetch('/api/settings/operational-controls', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requireManagerPinAbove: config.requireManagerPinAbove ? Number(config.requireManagerPinAbove) : null,
                    refundLimitPerDay: config.refundLimitPerDay ? Number(config.refundLimitPerDay) : null,
                    allowNegativeStock: config.allowNegativeStock,
                    autoLockMinutes: config.autoLockMinutes ? Number(config.autoLockMinutes) : 3
                })
            });
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
        } catch { /* ignore */ }
        setSaving(false);
    }

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Shield size={28} className="text-[var(--primary)]" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Operational Controls</h1>
                    <p className="text-sm text-[var(--text-muted)]">Refund thresholds, stock guard, auto-lock settings</p>
                </div>
            </div>

            {saved && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> Settings saved successfully
                </div>
            )}

            {/* Refund Thresholds */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><DollarSign size={18} className="text-red-400" /> Refund Controls</h3>
                <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-1">Manager PIN required above ($)</label>
                    <input type="number" step="0.01" min="0" value={config.requireManagerPinAbove} onChange={e => setConfig({ ...config, requireManagerPinAbove: e.target.value })}
                        placeholder="e.g. 50.00 (leave blank to disable)"
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Refunds above this amount require manager PIN approval</p>
                </div>
                <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-1">Daily refund limit per employee ($)</label>
                    <input type="number" step="0.01" min="0" value={config.refundLimitPerDay} onChange={e => setConfig({ ...config, refundLimitPerDay: e.target.value })}
                        placeholder="e.g. 200.00 (leave blank to disable)"
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Total refund amount allowed per employee per day</p>
                </div>
            </div>

            {/* Negative Stock */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Shield size={18} className="text-amber-400" /> Stock Guard</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-[var(--text-primary)]">Allow negative stock</div>
                        <p className="text-xs text-[var(--text-muted)]">When off (default), sales that would result in negative stock are blocked</p>
                    </div>
                    <button onClick={() => setConfig({ ...config, allowNegativeStock: !config.allowNegativeStock })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${config.allowNegativeStock ? 'bg-amber-500' : 'bg-[var(--border)]'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.allowNegativeStock ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                </div>
                {config.allowNegativeStock && (
                    <div className="p-2 bg-amber-500/10 rounded-lg text-xs text-amber-400">
                        ⚠ Negative stock is enabled. Sales will proceed even when stock hits zero. This can be overridden per-location.
                    </div>
                )}
            </div>

            {/* Auto-Lock */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><Shield size={18} className="text-blue-400" /> Auto-Lock Timer</h3>
                <div>
                    <label className="text-sm text-[var(--text-muted)] block mb-1">Inactivity timeout (minutes)</label>
                    <input type="number" min="1" max="60" value={config.autoLockMinutes} onChange={e => setConfig({ ...config, autoLockMinutes: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    <p className="text-xs text-[var(--text-muted)] mt-1">POS registers lock after this many minutes of inactivity. Default: 3. Can be overridden per-station.</p>
                </div>
            </div>

            <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    );
}
