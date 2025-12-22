'use client'

import { useState } from 'react'
import { X, Save, Smartphone } from 'lucide-react'

interface AddTerminalModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    locations: { id: string, name: string }[]
}

export default function AddTerminalModal({ isOpen, onClose, onSuccess, locations }: AddTerminalModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [formData, setFormData] = useState({
        serialNumber: '',
        model: 'PAX A920',
        locationId: ''
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch('/api/admin/terminals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                onSuccess()
                onClose()
                setFormData({ serialNumber: '', model: 'PAX A920', locationId: '' })
            } else {
                setToast({ message: 'Failed to add terminal', type: 'error' })
            }
        } catch (error) {
            console.error(error)
            setToast({ message: 'Error adding terminal', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-stone-800">
                    <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-orange-500" />
                        Add New Terminal
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">
                            Serial Number (S/N)
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                            placeholder="e.g. SN12345678"
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">
                            Model
                        </label>
                        <select
                            value={formData.model}
                            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        >
                            <option value="PAX A920">PAX A920</option>
                            <option value="PAX A920Pro">PAX A920 Pro</option>
                            <option value="PAX A80">PAX A80</option>
                            <option value="PAX A77">PAX A77</option>
                            <option value="PAX A35">PAX A35</option>
                            <option value="PAX E700">PAX E700</option>
                            <option value="PAX S300">PAX S300</option>
                            <option value="PAX S80">PAX S80</option>
                            <option value="Virtual Terminal">Virtual Terminal</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-1">
                            Assign to Location
                        </label>
                        <select
                            required
                            value={formData.locationId}
                            onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        >
                            <option value="">Select Location...</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

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
                            {isLoading ? 'Adding...' : 'Add Terminal'}
                        </button>
                    </div>
                </form>
            </div>
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}
