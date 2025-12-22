'use client'

import { useState } from 'react'
import { X, Loader2, Check, Copy } from 'lucide-react'

interface CreateLicenseModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateLicenseModal({ isOpen, onClose, onSuccess }: CreateLicenseModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        maxTerminals: '3',
        expiresAt: '',
        notes: ''
    })
    const [createdLicense, setCreatedLicense] = useState<any>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch('/api/admin/licenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: formData.customerName,
                    customerEmail: formData.customerEmail,
                    maxTerminals: formData.maxTerminals === 'unlimited' ? null : parseInt(formData.maxTerminals),
                    expiresAt: formData.expiresAt || null,
                    notes: formData.notes
                })
            })

            const data = await res.json()

            if (res.ok) {
                setCreatedLicense(data.license)
                onSuccess() // Refresh list in parent
            } else {
                setToast({ message: data.error || 'Failed to create license', type: 'error' })
            }
        } catch (error) {
            console.error('Create license error:', error)
            setToast({ message: 'Failed to create license', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setToast({ message: 'License key copied to clipboard!', type: 'success' })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {createdLicense ? 'License Created' : 'Create New License'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {createdLicense ? (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Check className="h-8 w-8 text-emerald-500" />
                            </div>

                            <div>
                                <p className="text-stone-400 mb-2">License Key Generated</p>
                                <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl p-4">
                                    <code className="flex-1 font-mono text-emerald-400 font-bold text-lg">
                                        {createdLicense.licenseKey}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(createdLicense.licenseKey)}
                                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                                    >
                                        <Copy className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-stone-500 mt-2">
                                    Share this key with the customer to activate their POS.
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.customerName}
                                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    placeholder="e.g. Joe's Salon"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Max Terminals</label>
                                <select
                                    value={formData.maxTerminals}
                                    onChange={e => setFormData({ ...formData, maxTerminals: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="1">1 Terminal</option>
                                    <option value="2">2 Terminals</option>
                                    <option value="3">3 Terminals</option>
                                    <option value="5">5 Terminals</option>
                                    <option value="10">10 Terminals</option>
                                    <option value="unlimited">Unlimited</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Expiration Date (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.expiresAt}
                                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
                                    placeholder="Internal notes..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create License'
                                )}
                            </button>
                        </form>
                    )}
                </div>
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
