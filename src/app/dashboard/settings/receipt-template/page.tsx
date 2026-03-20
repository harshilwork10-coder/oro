'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Receipt, Save } from 'lucide-react'

export default function ReceiptTemplatePage() {
    const [template, setTemplate] = useState({
        header: { showLogo: true, storeName: true, address: true, phone: true, customLine1: '', customLine2: '' },
        body: { showBarcode: false, showSKU: false, showSavings: true, showTaxBreakdown: true },
        footer: { returnPolicy: 'Returns accepted within 30 days with receipt.', promoMessage: '', showSurveyLink: false, surveyUrl: '', customLine1: '', customLine2: '', showThankYou: true }
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetch('/api/settings/receipt-template').then(r => r.json()).then(d => { if (d.data?.template) setTemplate(d.data.template) }) }, [])

    const save = async () => {
        setSaving(true)
        await fetch('/api/settings/receipt-template', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) })
        setSaving(false)
    }

    const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
        <label className="flex items-center justify-between py-2">
            <span className="text-sm">{label}</span>
            <button onClick={() => onChange(!checked)} className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-stone-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ml-1 ${checked ? 'translate-x-4' : ''}`} />
            </button>
        </label>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="h-8 w-8 text-purple-500" /> Receipt Template</h1>
                        <p className="text-stone-400">Customize your printed & digital receipts</p>
                    </div>
                </div>
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold">
                    <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 text-purple-400">Header</h2>
                    <Toggle label="Show Logo" checked={template.header.showLogo} onChange={v => setTemplate(p => ({ ...p, header: { ...p.header, showLogo: v } }))} />
                    <Toggle label="Show Store Name" checked={template.header.storeName} onChange={v => setTemplate(p => ({ ...p, header: { ...p.header, storeName: v } }))} />
                    <Toggle label="Show Address" checked={template.header.address} onChange={v => setTemplate(p => ({ ...p, header: { ...p.header, address: v } }))} />
                    <Toggle label="Show Phone" checked={template.header.phone} onChange={v => setTemplate(p => ({ ...p, header: { ...p.header, phone: v } }))} />
                    <input value={template.header.customLine1} onChange={e => setTemplate(p => ({ ...p, header: { ...p.header, customLine1: e.target.value } }))} placeholder="Custom line 1 (e.g., 'Tax ID: 123')" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-3" />
                    <input value={template.header.customLine2} onChange={e => setTemplate(p => ({ ...p, header: { ...p.header, customLine2: e.target.value } }))} placeholder="Custom line 2" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-2" />
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 text-blue-400">Body</h2>
                    <Toggle label="Show Item Barcode" checked={template.body.showBarcode} onChange={v => setTemplate(p => ({ ...p, body: { ...p.body, showBarcode: v } }))} />
                    <Toggle label="Show SKU" checked={template.body.showSKU} onChange={v => setTemplate(p => ({ ...p, body: { ...p.body, showSKU: v } }))} />
                    <Toggle label="Show Savings" checked={template.body.showSavings} onChange={v => setTemplate(p => ({ ...p, body: { ...p.body, showSavings: v } }))} />
                    <Toggle label="Show Tax Breakdown" checked={template.body.showTaxBreakdown} onChange={v => setTemplate(p => ({ ...p, body: { ...p.body, showTaxBreakdown: v } }))} />
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 text-emerald-400">Footer</h2>
                    <Toggle label="Show Thank You" checked={template.footer.showThankYou} onChange={v => setTemplate(p => ({ ...p, footer: { ...p.footer, showThankYou: v } }))} />
                    <Toggle label="Show Survey Link" checked={template.footer.showSurveyLink} onChange={v => setTemplate(p => ({ ...p, footer: { ...p.footer, showSurveyLink: v } }))} />
                    {template.footer.showSurveyLink && <input value={template.footer.surveyUrl} onChange={e => setTemplate(p => ({ ...p, footer: { ...p.footer, surveyUrl: e.target.value } }))} placeholder="Survey URL" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-2" />}
                    <textarea value={template.footer.returnPolicy} onChange={e => setTemplate(p => ({ ...p, footer: { ...p.footer, returnPolicy: e.target.value } }))} placeholder="Return policy" rows={2} className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-3" />
                    <input value={template.footer.promoMessage} onChange={e => setTemplate(p => ({ ...p, footer: { ...p.footer, promoMessage: e.target.value } }))} placeholder="Promo message (e.g., '10% off next visit!')" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-2" />
                    <input value={template.footer.customLine1} onChange={e => setTemplate(p => ({ ...p, footer: { ...p.footer, customLine1: e.target.value } }))} placeholder="Custom footer line 1" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm mt-2" />
                </div>
            </div>
        </div>
    )
}
