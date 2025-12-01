'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import {
    ArrowLeft, Phone, Mail, MapPin, DollarSign,
    Calendar, TrendingUp, Star, Edit, Trash2,
    CheckCircle, Clock, MessageSquare, FileText,
    Plus, X
} from 'lucide-react'
import Link from 'next/link'
import ActivityModal from '@/components/crm/ActivityModal'
import NoteModal from '@/components/crm/NoteModal'
import TaskModal from '@/components/crm/TaskModal'

interface Lead {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    city: string | null
    state: string | null
    status: string
    source: string | null
    estimatedValue: number | null
    proposedFee: number | null
    score: number | null
    rating: string | null
    probability: number | null
    expectedClose: string | null
    lastActivityAt: string | null
    emailOpens: number
    emailClicks: number
    callCount: number
    meetingCount: number
    createdAt: string
    notes: any[]
    activities: any[]
    tasks: any[]
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const unwrappedParams = use(params)
    const [lead, setLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks'>('timeline')
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [showTaskModal, setShowTaskModal] = useState(false)

    useEffect(() => {
        fetchLead()
    }, [])

    const fetchLead = async () => {
        try {
            const res = await fetch(`/api/crm/leads/${unwrappedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                setLead(data)
            } else {
                router.push('/dashboard/crm/leads')
            }
        } catch (error) {
            console.error('Error fetching lead:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleActivitySave = (activity: any) => {
        if (lead) {
            setLead({
                ...lead,
                activities: [activity, ...lead.activities],
                callCount: activity.type === 'CALL' ? lead.callCount + 1 : lead.callCount,
                meetingCount: activity.type === 'MEETING' ? lead.meetingCount + 1 : lead.meetingCount
            })
        }
    }

    const handleNoteSave = (note: any) => {
        if (lead) {
            setLead({
                ...lead,
                notes: [note, ...lead.notes]
            })
        }
    }

    const handleTaskSave = (task: any) => {
        if (lead) {
            setLead({
                ...lead,
                tasks: [...(lead.tasks || []), task]
            })
        }
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'NEW': 'bg-blue-100 text-blue-700 border-blue-200',
            'CONTACTED': 'bg-purple-100 text-purple-700 border-purple-200',
            'QUALIFIED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'PROPOSAL': 'bg-amber-100 text-amber-700 border-amber-200',
            'NEGOTIATION': 'bg-orange-100 text-orange-700 border-orange-200',
            'CLOSED_WON': 'bg-green-100 text-green-700 border-green-200',
            'CLOSED_LOST': 'bg-red-100 text-red-700 border-red-200'
        }
        return colors[status] || 'bg-stone-100 text-stone-700 border-stone-200'
    }

    const getRatingColor = (rating: string | null) => {
        if (!rating) return 'text-stone-400'
        const colors: Record<string, string> = {
            'HOT': 'text-red-500',
            'WARM': 'text-orange-500',
            'COLD': 'text-blue-500'
        }
        return colors[rating] || 'text-stone-400'
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-800">Lead not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Leads
                </Link>

                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                            {lead.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900">{lead.name}</h1>
                            {lead.company && <p className="text-lg text-stone-500 mt-1">{lead.company}</p>}
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(lead.status)}`}>
                                    {lead.status.replace('_', ' ')}
                                </span>
                                {lead.rating && (
                                    <div className="flex items-center gap-1">
                                        <Star className={`h-4 w-4 ${getRatingColor(lead.rating)} fill-current`} />
                                        <span className={`text-sm font-medium ${getRatingColor(lead.rating)}`}>{lead.rating}</span>
                                    </div>
                                )}
                                {lead.score !== null && (
                                    <span className="text-sm text-stone-600">
                                        Score: <span className="font-bold">{lead.score}/100</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/dashboard/crm/leads/${lead.id}/edit`} className="px-4 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium flex items-center gap-2">
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center gap-2">
                            <Trash2 className="h-4 w-4" /> Delete
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-stone-200 p-4">
                            <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
                                <Phone className="h-4 w-4" />
                                <span>Calls</span>
                            </div>
                            <p className="text-2xl font-bold text-stone-900">{lead.callCount}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-stone-200 p-4">
                            <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
                                <Calendar className="h-4 w-4" />
                                <span>Meetings</span>
                            </div>
                            <p className="text-2xl font-bold text-stone-900">{lead.meetingCount}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-stone-200 p-4">
                            <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
                                <Mail className="h-4 w-4" />
                                <span>Email Opens</span>
                            </div>
                            <p className="text-2xl font-bold text-stone-900">{lead.emailOpens}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-stone-200 p-4">
                            <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>Clicks</span>
                            </div>
                            <p className="text-2xl font-bold text-stone-900">{lead.emailClicks}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="border-b border-stone-200 flex">
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'timeline'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-stone-600 hover:bg-stone-50'
                                    }`}
                            >
                                Activity Timeline
                            </button>
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'notes'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-stone-600 hover:bg-stone-50'
                                    }`}
                            >
                                Notes ({lead.notes.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === 'tasks'
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-stone-600 hover:bg-stone-50'
                                    }`}
                            >
                                Tasks ({lead.tasks?.length || 0})
                            </button>
                        </div>

                        <div className="p-6">
                            {activeTab === 'timeline' && (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowActivityModal(true)}
                                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" /> Log Activity
                                    </button>

                                    {lead.activities.length === 0 ? (
                                        <p className="text-center text-stone-500 py-8">No activities yet</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {lead.activities.map((activity) => (
                                                <div key={activity.id} className="flex gap-4 p-4 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                            {activity.type === 'CALL' && <Phone className="h-5 w-5" />}
                                                            {activity.type === 'EMAIL' && <Mail className="h-5 w-5" />}
                                                            {activity.type === 'MEETING' && <Calendar className="h-5 w-5" />}
                                                            {activity.type === 'NOTE' && <MessageSquare className="h-5 w-5" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-stone-900">{activity.subject}</h4>
                                                        {activity.notes && <p className="text-sm text-stone-600 mt-1">{activity.notes}</p>}
                                                        <p className="text-xs text-stone-400 mt-2">
                                                            {new Date(activity.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowNoteModal(true)}
                                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" /> Add Note
                                    </button>

                                    {lead.notes.length === 0 ? (
                                        <p className="text-center text-stone-500 py-8">No notes yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {lead.notes.map((note) => (
                                                <div key={note.id} className="p-4 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">
                                                    <p className="text-stone-900">{note.content}</p>
                                                    <p className="text-xs text-stone-400 mt-2">
                                                        {new Date(note.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowTaskModal(true)}
                                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" /> Create Task
                                    </button>

                                    <p className="text-center text-stone-500 py-8">Task management coming soon</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Contact & Financial Info */}
                <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-stone-900 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-stone-400" />
                                <a href={`mailto:${lead.email}`} className="text-purple-600 hover:underline">{lead.email}</a>
                            </div>
                            {lead.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-stone-400" />
                                    <a href={`tel:${lead.phone}`} className="text-purple-600 hover:underline">{lead.phone}</a>
                                </div>
                            )}
                            {(lead.city || lead.state) && (
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-5 w-5 text-stone-400" />
                                    <span className="text-stone-700">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Information */}
                    {(lead.estimatedValue || lead.proposedFee) && (
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-stone-900 mb-4">Financial Details</h3>
                            <div className="space-y-3">
                                {lead.estimatedValue && (
                                    <div>
                                        <p className="text-sm text-stone-500 mb-1">Estimated Value</p>
                                        <p className="text-2xl font-bold text-emerald-600">${lead.estimatedValue.toLocaleString()}</p>
                                    </div>
                                )}
                                {lead.proposedFee && (
                                    <div>
                                        <p className="text-sm text-stone-500 mb-1">Proposed Fee</p>
                                        <p className="text-xl font-bold text-stone-900">${lead.proposedFee.toLocaleString()}</p>
                                    </div>
                                )}
                                {lead.probability !== null && (
                                    <div>
                                        <p className="text-sm text-stone-500 mb-1">Close Probability</p>
                                        <p className="text-xl font-bold text-purple-600">{lead.probability}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-stone-900 mb-4">Lead Details</h3>
                        <div className="space-y-3 text-sm">
                            {lead.source && (
                                <div>
                                    <p className="text-stone-500">Source</p>
                                    <p className="font-medium text-stone-900">{lead.source}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-stone-500">Created</p>
                                <p className="font-medium text-stone-900">{new Date(lead.createdAt).toLocaleDateString()}</p>
                            </div>
                            {lead.lastActivityAt && (
                                <div>
                                    <p className="text-stone-500">Last Activity</p>
                                    <p className="font-medium text-stone-900">{new Date(lead.lastActivityAt).toLocaleDateString()}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ActivityModal
                isOpen={showActivityModal}
                onClose={() => setShowActivityModal(false)}
                onSave={handleActivitySave}
                leadId={lead.id}
            />
            <NoteModal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                onSave={handleNoteSave}
                leadId={lead.id}
            />
            <TaskModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSave={handleTaskSave}
                leadId={lead.id}
            />
        </div>
    )
}
