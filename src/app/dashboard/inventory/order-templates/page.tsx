'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Copy, X, Package } from 'lucide-react';

export default function OrderTemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/order-templates'); if (res.ok) { const d = await res.json(); setTemplates(d.templates || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    async function generatePOFromTemplate(templateId: string) {
        try {
            const res = await fetch(`/api/inventory/order-templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'GENERATE_PO', templateId }) });
            if (res.ok) { alert('Purchase order created from template'); }
        } catch {}
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><FileText size={28} className="text-blue-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Order Templates</h1><p className="text-sm text-[var(--text-muted)]">Saved order templates for quick PO generation</p></div></div>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !templates.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><FileText size={48} className="mx-auto mb-3 opacity-30" /><p>No order templates yet</p></div>
            ) : (
                <div className="space-y-3">{templates.map((t: any) => (
                    <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div><div className="text-sm font-medium text-[var(--text-primary)]">{t.name}</div><div className="text-xs text-[var(--text-muted)]">{t.items?.length || t.itemCount || 0} items • {t.supplier?.name || t.supplierName || 'No supplier'}</div></div>
                            <button onClick={() => generatePOFromTemplate(t.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"><Copy size={12} /> Use Template</button>
                        </div>
                    </div>
                ))}</div>
            )}
        </div>
    );
}
