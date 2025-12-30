'use client'

import { useState } from 'react'
import { X, Monitor, Loader2, CheckCircle2 } from 'lucide-react'

interface RequestStationsModalProps {
    isOpen: boolean
    onClose: () => void
    locationId: string
    locationName: string
    onSuccess: () => void
}

export default function RequestStationsModal({ isOpen, onClose, locationId, locationName, onSuccess }: RequestStationsModalProps) {
    const [stations, setStations] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/franchisor/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    numberOfStations: stations
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit request')
            }

            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
                setSuccess(false)
                setStations(1)
            }, 2000)

        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                        <Monitor className="h-6 w-6 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100">Request Stations</h2>
                    <p className="text-sm text-stone-400 mt-1">
                        Add POS stations to <span className="text-stone-200 font-medium">{locationName}</span>
                    </p>
                </div>

                {success ? (
                    <div className="py-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-stone-100">Request Sent!</h3>
                        <p className="text-stone-400 mt-2 text-sm">
                            We've received your order. You'll receive an email shortly with the contract.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Number of Stations
                            </label>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStations(Math.max(1, stations - 1))}
                                    className="h-10 w-10 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 hover:bg-stone-700 transition-colors"
                                >
                                    -
                                </button>
                                <div className="flex-1 h-10 bg-stone-900/50 border border-stone-700 rounded-lg flex items-center justify-center text-lg font-bold text-stone-100">
                                    {stations}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStations(stations + 1)}
                                    className="h-10 w-10 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 hover:bg-stone-700 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-900/20 text-white font-medium px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Place Order'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

