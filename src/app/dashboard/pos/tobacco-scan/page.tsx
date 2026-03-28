'use client';

import { useState, useEffect } from 'react';
import { Cigarette, FileText, DollarSign, Upload, Download, BarChart3 } from 'lucide-react';

export default function TobaccoScanPage() {
    const [weekData, setWeekData] = useState<any>(null);
    const [rebateData, setRebateData] = useState<any>(null);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        async function fetchAll() {
            try {
                const [w, r, c] = await Promise.all([
                    fetch('/api/tobacco-scan/current-week').then(r => r.ok ? r.json() : null),
                    fetch('/api/tobacco-scan/rebate-estimate').then(r => r.ok ? r.json() : null),
                    fetch('/api/tobacco-scan/manufacturer-config').then(r => r.ok ? r.json() : null),
                ]);
                setWeekData(w); setRebateData(r); setConfigs(c?.configs || []);
            } catch {}
            setLoading(false);
        }
        fetchAll();
    }, []);

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
    const tabs = [{ key: 'overview', label: 'Overview' }, { key: 'rebates', label: 'Rebate Estimates' }, { key: 'configs', label: 'Manufacturer Config' }];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3"><Cigarette size={28} className="text-amber-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Tobacco Scan Data</h1><p className="text-sm text-[var(--text-muted)]">Scan-data compliance, rebate estimates, manufacturer config</p></div></div>

            <div className="flex gap-2">{tabs.map(t => (<button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === t.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>{t.label}</button>))}</div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : activeTab === 'overview' ? (
                <div className="space-y-4">
                    {weekData && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">This Week Scans</div><div className="text-xl font-bold text-[var(--text-primary)]">{weekData.totalScans ?? weekData.count ?? 0}</div></div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Revenue</div><div className="text-xl font-bold text-emerald-400">{fmt(weekData.totalRevenue || weekData.revenue || 0)}</div></div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Pack Count</div><div className="text-xl font-bold text-[var(--text-primary)]">{weekData.packCount || 0}</div></div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Carton Count</div><div className="text-xl font-bold text-[var(--text-primary)]">{weekData.cartonCount || 0}</div></div>
                    </div>}
                </div>
            ) : activeTab === 'rebates' ? (
                <div className="space-y-4">
                    {rebateData && <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Weekly Rebate Est.</div><div className="text-xl font-bold text-emerald-400">{fmt(rebateData.weeklyRebate || rebateData.weekly?.rebate || 0)}</div></div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Monthly Rebate Est.</div><div className="text-xl font-bold text-emerald-400">{fmt(rebateData.monthlyRebate || rebateData.monthly?.rebate || 0)}</div></div>
                    </div>}
                </div>
            ) : (
                <div className="space-y-3">{configs.length ? configs.map((c: any, i: number) => (
                    <div key={c.id || i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between"><div className="text-sm font-medium text-[var(--text-primary)]">{c.manufacturer}</div><span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)]'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">{c.storeId || '—'} • Pack: {fmt(Number(c.rebatePerPack || 0))} • Carton: {fmt(Number(c.rebatePerCarton || 0))}</div>
                    </div>
                )) : <div className="p-8 text-center text-[var(--text-muted)]">No manufacturer configs</div>}</div>
            )}
        </div>
    );
}
