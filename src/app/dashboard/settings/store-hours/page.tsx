'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Save, Plus, Trash2 } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function StoreHoursPage() {
    const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({})
    const [holidays, setHolidays] = useState<{ date: string; name: string; closed: boolean }[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch('/api/settings/store-hours').then(r => r.json()).then(data => {
            if (data.data?.storeHours) setHours(data.data.storeHours)
            else {
                const defaults: any = {}
                DAYS.forEach(d => { defaults[d] = { open: '06:00', close: '22:00', closed: false } })
                setHours(defaults)
            }
            if (data.data?.holidays) setHolidays(data.data.holidays)
        })
    }, [])

    const save = async () => {
        setSaving(true)
        await fetch('/api/settings/store-hours', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeHours: hours, holidays })
        })
        setSaving(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Clock className="h-8 w-8 text-blue-500" /> Store Hours</h1>
                        <p className="text-stone-400">Set operating hours & holiday schedule</p>
                    </div>
                </div>
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold">
                    <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Weekly Schedule</h2>
                    <div className="space-y-3">
                        {DAYS.map(day => (
                            <div key={day} className="flex items-center gap-3">
                                <span className="w-28 capitalize font-medium">{day}</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={!hours[day]?.closed}
                                        onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], closed: !e.target.checked } }))}
                                        className="w-4 h-4 rounded" />
                                    <span className="text-xs text-stone-400">{hours[day]?.closed ? 'Closed' : 'Open'}</span>
                                </label>
                                {!hours[day]?.closed && (
                                    <>
                                        <input type="time" value={hours[day]?.open || '06:00'}
                                            onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], open: e.target.value } }))}
                                            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm" />
                                        <span className="text-stone-500">to</span>
                                        <input type="time" value={hours[day]?.close || '22:00'}
                                            onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], close: e.target.value } }))}
                                            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm" />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Holidays</h2>
                        <button onClick={() => setHolidays(p => [...p, { date: '', name: '', closed: true }])}
                            className="flex items-center gap-1 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm">
                            <Plus className="h-3 w-3" /> Add
                        </button>
                    </div>
                    <div className="space-y-3">
                        {holidays.length === 0 && <p className="text-stone-500 text-sm">No holidays configured</p>}
                        {holidays.map((h, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <input type="date" value={h.date} onChange={e => { const u = [...holidays]; u[i].date = e.target.value; setHolidays(u) }}
                                    className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm" />
                                <input value={h.name} onChange={e => { const u = [...holidays]; u[i].name = e.target.value; setHolidays(u) }}
                                    placeholder="Holiday name" className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm" />
                                <button onClick={() => setHolidays(p => p.filter((_, j) => j !== i))} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
