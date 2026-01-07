'use client'

import { useState, useEffect } from 'react'
import { X, Clock, Calendar, Repeat, Trash2, Plus } from 'lucide-react'

interface TimeBlock {
    id: string
    title: string
    startTime: string
    endTime: string
    isRecurring: boolean
    recurringDays: string | null
}

interface TimeBlockModalProps {
    isOpen: boolean
    onClose: () => void
    onBlockCreated?: () => void
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TimeBlockModal({ isOpen, onClose, onBlockCreated }: TimeBlockModalProps) {
    const [blocks, setBlocks] = useState<TimeBlock[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [title, setTitle] = useState('Personal Time')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('17:00')
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurringDays, setRecurringDays] = useState<number[]>([])

    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchBlocks()
            // Default to today
            setDate(new Date().toISOString().split('T')[0])
        }
    }, [isOpen])

    const fetchBlocks = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/schedule/blocks')
            if (res.ok) {
                const data = await res.json()
                setBlocks(data.timeBlocks || [])
            }
        } catch (err) {
            console.error('Failed to fetch blocks:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const startDateTime = new Date(`${date}T${startTime}`)
            const endDateTime = new Date(`${date}T${endTime}`)

            const res = await fetch('/api/schedule/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    isRecurring,
                    recurringDays: isRecurring ? recurringDays : null
                })
            })

            if (res.ok) {
                setShowForm(false)
                setTitle('Personal Time')
                setIsRecurring(false)
                setRecurringDays([])
                fetchBlocks()
                onBlockCreated?.()
            }
        } catch (err) {
            console.error('Failed to create block:', err)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this time block?')) return

        try {
            const res = await fetch(`/api/schedule/blocks?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchBlocks()
                onBlockCreated?.()
            }
        } catch (err) {
            console.error('Failed to delete block:', err)
        }
    }

    const toggleDay = (day: number) => {
        setRecurringDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        )
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg">
                            <Clock className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Time Blocking</h2>
                            <p className="text-xs text-stone-400">Block off personal time</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Add Block Button */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full py-3 border-2 border-dashed border-stone-600 rounded-xl text-stone-400 hover:text-white hover:border-violet-500 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Block Time Off
                        </button>
                    )}

                    {/* New Block Form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="bg-stone-800/50 border border-stone-700 rounded-xl p-4 space-y-4">
                            <div>
                                <label className="text-sm text-stone-400 block mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white focus:border-violet-500 outline-none"
                                    placeholder="e.g., Doctor Appointment, Vacation"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-stone-400 block mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white focus:border-violet-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-stone-400 block mb-1">From</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white focus:border-violet-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-stone-400 block mb-1">To</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-white focus:border-violet-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Recurring toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Repeat className="h-4 w-4 text-stone-400" />
                                    <span className="text-sm text-stone-300">Repeats weekly</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsRecurring(!isRecurring)}
                                    className={`w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-violet-600' : 'bg-stone-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Recurring days */}
                            {isRecurring && (
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS_OF_WEEK.map((day, idx) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(idx)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${recurringDays.includes(idx)
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-stone-700 text-stone-400 hover:text-white'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? 'Saving...' : 'Block Time'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Existing Blocks */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-stone-400">Your Blocked Time</h3>

                        {loading ? (
                            <div className="text-center py-8 text-stone-500">Loading...</div>
                        ) : blocks.length === 0 ? (
                            <div className="text-center py-8 text-stone-500">
                                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No blocked time</p>
                            </div>
                        ) : (
                            blocks.map(block => (
                                <div
                                    key={block.id}
                                    className="flex items-center justify-between p-3 bg-stone-800/50 border border-stone-700 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-white">{block.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-stone-400">
                                            <span>{new Date(block.startTime).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>
                                                {new Date(block.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                {' - '}
                                                {new Date(block.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                            {block.isRecurring && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Repeat className="h-3 w-3" /> Weekly
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(block.id)}
                                        className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
