'use client'

import { useState } from 'react'
import { X, Phone, Mail, Calendar, MessageSquare, Save } from 'lucide-react'

interface ActivityModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (activity: any) => void
    leadId: string
}

export default function ActivityModal({ isOpen, onClose, onSave, leadId }: ActivityModalProps) {
    const [activityType, setActivityType] = useState<'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'>('CALL')
    const [subject, setSubject] = useState('')
    const [notes, setNotes] = useState('')
    const [duration, setDuration] = useState('')
    const [outcome, setOutcome] = useState('POSITIVE')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/crm/leads/${leadId}/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activityType,
                    subject,
                    notes,
                    duration: duration ? parseInt(duration) : null,
                    outcome: activityType === 'CALL' ? outcome : null
                })
            })

            if (res.ok) {
                const activity = await res.json()
                onSave(activity)
                // Reset form
                setSubject('')
                setNotes('')
                setDuration('')
                setOutcome('POSITIVE')
                onClose()
            }
        } catch (error) {
            console.error('Error logging activity:', error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = () => {
        switch (activityType) {
            case 'CALL': return <Phone className="h-5 w-5" />
            case 'EMAIL': return <Mail className="h-5 w-5" />
            case 'MEETING': return <Calendar className="h-5 w-5" />
            case 'NOTE': return <MessageSquare className="h-5 w-5" />
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            {getIcon()}
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900">Log Activity</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-stone-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Activity Type */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Activity Type</label>
                        <div className="grid grid-cols-4 gap-3">
                            {(['CALL', 'EMAIL', 'MEETING', 'NOTE'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setActivityType(type)}
                                    className={`p-3 rounded-lg border-2 transition-all ${activityType === type
                                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                                            : 'border-stone-200 hover:border-purple-200 text-stone-600'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        {type === 'CALL' && <Phone className="h-5 w-5" />}
                                        {type === 'EMAIL' && <Mail className="h-5 w-5" />}
                                        {type === 'MEETING' && <Calendar className="h-5 w-5" />}
                                        {type === 'NOTE' && <MessageSquare className="h-5 w-5" />}
                                        <span className="text-xs font-medium">{type}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder={
                                activityType === 'CALL' ? 'e.g., Follow-up call regarding franchise fees' :
                                    activityType === 'EMAIL' ? 'e.g., Sent proposal document' :
                                        activityType === 'MEETING' ? 'e.g., Discovery meeting at office' :
                                            'e.g., Discussed territory preferences'
                            }
                        />
                    </div>

                    {/* Duration (for calls and meetings) */}
                    {(activityType === 'CALL' || activityType === 'MEETING') && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="30"
                                min="1"
                            />
                        </div>
                    )}

                    {/* Outcome (for calls) */}
                    {activityType === 'CALL' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">Outcome</label>
                            <select
                                value={outcome}
                                onChange={(e) => setOutcome(e.target.value)}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            >
                                <option value="POSITIVE">Positive - Moving Forward</option>
                                <option value="NEUTRAL">Neutral - Need Follow-up</option>
                                <option value="NEGATIVE">Negative - Not Interested</option>
                                <option value="NO_ANSWER">No Answer - Left Voicemail</option>
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                            placeholder="Add any additional details about this interaction..."
                        />
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
                                    <Save className="h-4 w-4" /> Save Activity
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

