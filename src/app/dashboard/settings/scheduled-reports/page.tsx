'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Plus, Trash2, Save, RefreshCw } from 'lucide-react'

export default function ScheduledReportsPage() {
    const [schedules, setSchedules] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ email: '', reportType: 'FLASH', frequency: 'DAILY', time: '07:00', enabled: true })

    useEffect(() => { fetch('/api/reports/scheduled').then(r => r.json()).then(d => { setSchedules(d.data?.schedules || []); setLoading(false) }) }, [])

    const save = async () => {
        await fetch('/api/reports/scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setShowForm(false)
        setForm({ email: '', reportType: 'FLASH', frequency: 'DAILY', time: '07:00', enabled: true })
        const r = await fetch('/api/reports/scheduled'); const d = await r.json(); setSchedules(d.data?.schedules || [])
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Mail className="h-8 w-8 text-cyan-500" /> Scheduled Reports</h1>
                        <p className="text-stone-400">Auto-email reports on a schedule</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl"><Plus className="h-4 w-4" /> Add Schedule</button>
            </div>

            {showForm && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5" />
                    <select value={form.reportType} onChange={e => setForm(p => ({ ...p, reportType: e.target.value }))} className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5">
                        <option value="FLASH">Flash Report</option><option value="WEEKLY_SUMMARY">Weekly Summary</option><option value="INVENTORY_ALERTS">Inventory Alerts</option>
                    </select>
                    <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5">
                        <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
                    </select>
                    <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5" />
                    <button onClick={save} className="bg-cyan-600 hover:bg-cyan-500 rounded-lg px-4 py-2.5 font-semibold flex items-center gap-2 justify-center"><Save className="h-4 w-4" /> Save</button>
                </div>
            )}

            {loading ? <div className="text-center py-12"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div> : schedules.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><Mail className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>No scheduled reports yet</p></div>
            ) : (
                <div className="space-y-3">
                    {schedules.map((s: any) => (
                        <div key={s.id} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 flex items-center justify-between">
                            <div>
                                <span className="font-semibold">{s.type}</span>
                                <span className="ml-3 text-stone-400">{s.config?.email} • {s.config?.frequency} at {s.config?.time}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${s.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-500/20 text-stone-400'}`}>{s.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
