'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface EditClientModalProps {
    client: {
        id: string
        name: string
        owner: {
            name: string
            email: string
        }
    }
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function EditClientModal({ client, isOpen, onClose, onSuccess }: EditClientModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: client.name,
        ownerName: client.owner.name,
        ownerEmail: client.owner.email,
        status: 'ACTIVE',
        notes: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/admin/clients/${client.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                onSuccess()
                onClose()
            }
        } catch (error) {
            console.error('Error updating client:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl p-6 w-full max-w-lg border border-stone-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-stone-100">Edit Client</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Owner Name
                        </label>
                        <input
                            type="text"
                            value={formData.ownerName}
                            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.ownerEmail}
                            onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Add any notes about this client..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
