'use client'

import { useState } from 'react'
import { X, MessageSquare, Save, Pin } from 'lucide-react'

interface NoteModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (note: any) => void
    leadId: string
}

export default function NoteModal({ isOpen, onClose, onSave, leadId }: NoteModalProps) {
    const [content, setContent] = useState('')
    const [category, setCategory] = useState('GENERAL')
    const [isPinned, setIsPinned] = useState(false)
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/crm/leads/${leadId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    category,
                    isPinned
                })
            })

            if (res.ok) {
                const note = await res.json()
                onSave(note)
                // Reset form
                setContent('')
                setCategory('GENERAL')
                setIsPinned(false)
                onClose()
            }
        } catch (error) {
            console.error('Error creating note:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900">Add Note</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-stone-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { value: 'GENERAL', label: 'General', color: 'stone' },
                                { value: 'FOLLOW_UP', label: 'Follow-up', color: 'blue' },
                                { value: 'DECISION', label: 'Decision', color: 'emerald' },
                                { value: 'RED_FLAG', label: 'Red Flag', color: 'red' }
                            ].map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${category === cat.value
                                            ? `border-${cat.color}-600 bg-${cat.color}-50 text-${cat.color}-700`
                                            : 'border-stone-200 hover:border-stone-300 text-stone-600'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            Note <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={8}
                            className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                            placeholder="Enter your note here... You can include important details, observations, or next steps."
                        />
                    </div>

                    {/* Pin Option */}
                    <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-lg">
                        <input
                            type="checkbox"
                            id="pin-note"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-stone-300 rounded"
                        />
                        <label htmlFor="pin-note" className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                            <Pin className="h-4 w-4" />
                            <span>Pin this note to the top</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-stone-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Save Note
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

