
'use client'

import { useState, useEffect } from 'react'
import { X, Save, Monitor, CreditCard, DollarSign } from 'lucide-react'

interface Terminal {
    id: string
    name: string
    terminalIP: string
}

interface Station {
    id: string
    name: string
    pairingCode: string
    paymentMode: 'DEDICATED' | 'CASH_ONLY'
    dedicatedTerminalId?: string | null
}

interface EditStationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (updatedStation: Station) => void
    station: Station
    terminals: Terminal[]
}

export default function EditStationModal({ isOpen, onClose, onSuccess, station, terminals }: EditStationModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        paymentMode: 'CASH_ONLY' as 'DEDICATED' | 'CASH_ONLY',
        dedicatedTerminalId: ''
    })

    useEffect(() => {
        if (station) {
            setFormData({
                name: station.name,
                paymentMode: station.paymentMode,
                dedicatedTerminalId: station.dedicatedTerminalId || ''
            })
        }
    }, [station])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch(`/api/settings/stations?id=${station.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    paymentMode: formData.paymentMode,
                    terminalId: formData.paymentMode === 'DEDICATED' ? formData.dedicatedTerminalId : null
                })
            })

            if (res.ok) {
                const data = await res.json()
                onSuccess(data.station)
                onClose()
            } else {
                alert('Failed to update station')
            }
        } catch (error) {
            console.error(error)
            alert('Error updating station')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-stone-800">
                    <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-orange-500" />
                        Edit Station
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">
                            Station Name
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">
                            Payment Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, paymentMode: 'CASH_ONLY' }))}
                                className={`px-4 py-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${formData.paymentMode === 'CASH_ONLY'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-700'
                                    }`}
                            >
                                <DollarSign className="h-6 w-6" />
                                <span className="text-xs font-bold">Cash Only</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, paymentMode: 'DEDICATED' }))}
                                className={`px-4 py-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${formData.paymentMode === 'DEDICATED'
                                    ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:border-stone-700'
                                    }`}
                            >
                                <CreditCard className="h-6 w-6" />
                                <span className="text-xs font-bold">Terminal</span>
                            </button>
                        </div>
                    </div>

                    {formData.paymentMode === 'DEDICATED' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-stone-400 mb-1">
                                Link Terminal
                            </label>
                            <select
                                required
                                value={formData.dedicatedTerminalId}
                                onChange={(e) => setFormData(prev => ({ ...prev, dedicatedTerminalId: e.target.value }))}
                                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                            >
                                <option value="">Select Terminal...</option>
                                {terminals.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.terminalIP})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-stone-400 hover:text-white mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
