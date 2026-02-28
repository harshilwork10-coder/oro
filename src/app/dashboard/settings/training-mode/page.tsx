'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, RefreshCw, Monitor } from 'lucide-react'

export default function TrainingModePage() {
    const [stations, setStations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/settings/stations').then(r => r.json()).then(d => {
            setStations(d.data?.stations || d.stations || [])
            setLoading(false)
        })
    }, [])

    const toggle = async (stationId: string, currentMode: boolean) => {
        await fetch('/api/pos/training-mode', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationId, enabled: !currentMode })
        })
        setStations(prev => prev.map(s => s.id === stationId ? { ...s, trainingMode: !currentMode } : s))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="h-8 w-8 text-yellow-500" /> Training Mode</h1>
                    <p className="text-stone-400">Enable training mode per station — transactions won&apos;t affect real data</p>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-400"><strong>⚠️ Training Mode:</strong> When enabled, all transactions on that station are flagged as training. They do NOT count toward sales, inventory, or cash accountability.</p>
            </div>

            {loading ? <div className="text-center py-12"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div> : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stations.map(s => (
                        <div key={s.id} className={`rounded-2xl p-5 border ${s.trainingMode ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-stone-900/80 border-stone-700'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Monitor className={`h-5 w-5 ${s.trainingMode ? 'text-yellow-400' : 'text-stone-400'}`} />
                                    <span className="font-semibold">{s.name}</span>
                                </div>
                                {s.trainingMode && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">TRAINING</span>}
                            </div>
                            <button onClick={() => toggle(s.id, s.trainingMode)}
                                className={`w-full py-2.5 rounded-xl font-semibold text-sm ${s.trainingMode ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}`}>
                                {s.trainingMode ? 'Disable Training' : 'Enable Training'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
