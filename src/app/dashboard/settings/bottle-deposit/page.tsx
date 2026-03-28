'use client';

import { useState, useEffect } from 'react';
import { Wine, Save, CheckCircle } from 'lucide-react';

export default function BottleDepositPage() {
    const [config, setConfig] = useState<any>({ enabled: false, amount: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        async function fetchConfig() {
            try { const res = await fetch('/api/settings/bottle-deposit'); if (res.ok) { const d = await res.json(); setConfig({ enabled: d.enabled ?? false, amount: d.amount?.toString() || '' }); } } catch {}
            setLoading(false);
        }
        fetchConfig();
    }, []);

    async function handleSave() {
        setSaving(true); setSaved(false);
        try { const res = await fetch('/api/settings/bottle-deposit', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: config.enabled, amount: config.amount ? Number(config.amount) : null }) }); if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); } } catch {}
        setSaving(false);
    }

    if (loading) return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-xl">
            <div className="flex items-center gap-3"><Wine size={28} className="text-blue-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Bottle Deposit / CRV</h1><p className="text-sm text-[var(--text-muted)]">Configure bottle deposit charges per location</p></div></div>

            {saved && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2"><CheckCircle size={16} /> Settings saved</div>}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><div className="text-sm text-[var(--text-primary)]">Enable Bottle Deposit</div><p className="text-xs text-[var(--text-muted)]">Automatically add deposit charge to qualifying items</p></div>
                    <button onClick={() => setConfig({ ...config, enabled: !config.enabled })} className={`w-12 h-6 rounded-full transition-colors relative ${config.enabled ? 'bg-blue-500' : 'bg-[var(--border)]'}`}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>
                </div>
                {config.enabled && (
                    <div><label className="text-sm text-[var(--text-muted)] block mb-1">Deposit Amount ($)</label>
                        <input type="number" step="0.01" min="0" value={config.amount} onChange={e => setConfig({ ...config, amount: e.target.value })} placeholder="e.g. 0.05" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                        <p className="text-xs text-[var(--text-muted)] mt-1">State-specific: CA $0.05-$0.10, OR $0.10, MI $0.10</p>
                    </div>
                )}
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>
        </div>
    );
}
