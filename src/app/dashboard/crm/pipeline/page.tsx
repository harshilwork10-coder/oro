'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { DollarSign, Phone, Mail, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'

interface Lead {
    id: string
    name: string
    email: string
    company: string | null
    estimatedValue: number | null
    status: string
    createdAt: string
}

const PIPELINE_STAGES = [
    { id: 'NEW', name: 'New Leads', color: 'bg-blue-500' },
    { id: 'CONTACTED', name: 'Contacted', color: 'bg-purple-500' },
    { id: 'QUALIFIED', name: 'Qualified', color: 'bg-emerald-500' },
    { id: 'PROPOSAL', name: 'Proposal', color: 'bg-amber-500' },
    { id: 'NEGOTIATION', name: 'Negotiation', color: 'bg-orange-500' },
    { id: 'CLOSED_WON', name: 'Closed Won', color: 'bg-green-500' }
]

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLeads()
    }, [])

    const fetchLeads = async () => {
        try {
            const res = await fetch('/api/crm/leads')
            if (res.ok) {
                const data = await res.json()
                // Filter out closed lost leads from pipeline view
                setLeads(data.filter((lead: Lead) => lead.status !== 'CLOSED_LOST'))
            }
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const getLeadsByStage = (stageId: string) => {
        return leads.filter(lead => lead.status === stageId)
    }

    const getStageValue = (stageId: string) => {
        const stageLeads = getLeadsByStage(stageId)
        return stageLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0)
    }

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        // Dropped outside a valid droppable
        if (!destination) return

        // Dropped in same position
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return
        }

        // Update lead status
        const newStatus = destination.droppableId
        const leadId = draggableId

        // Optimistically update UI
        setLeads(prevLeads =>
            prevLeads.map(lead =>
                lead.id === leadId ? { ...lead, status: newStatus } : lead
            )
        )

        // Update in backend
        try {
            await fetch(`/api/crm/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
        } catch (error) {
            console.error('Error updating lead:', error)
            // Revert on error
            fetchLeads()
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-stone-900">Sales Pipeline</h1>
                        <p className="text-stone-500 mt-1">Drag leads to update their stage</p>
                    </div>
                    <Link href="/dashboard/crm/leads/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Lead
                    </Link>
                </div>

                {/* Pipeline Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-medium">{leads.length} Active Leads</span>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="text-emerald-900 font-medium">
                            ${leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0).toLocaleString()} Total Value
                        </span>
                    </div>
                </div>
            </div>

            {/* Pipeline Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = getLeadsByStage(stage.id)
                        const stageValue = getStageValue(stage.id)

                        return (
                            <div key={stage.id} className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden flex flex-col">
                                {/* Stage Header */}
                                <div className={`${stage.color} p-4`}>
                                    <h3 className="text-white font-bold">{stage.name}</h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-white/90 text-sm">{stageLeads.length} leads</p>
                                        <p className="text-white/90 text-xs">${stageValue.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Droppable Area */}
                                <Droppable droppableId={stage.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 p-3 space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? 'bg-purple-50' : ''
                                                }`}
                                        >
                                            {stageLeads.map((lead, index) => (
                                                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`bg-white rounded-xl border border-stone-200 p-4 cursor-move hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-purple-500' : ''
                                                                }`}
                                                        >
                                                            <Link href={`/dashboard/crm/leads/${lead.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                                                                <h4 className="font-bold text-stone-900 mb-1 hover:text-purple-600 transition-colors">{lead.name}</h4>
                                                                {lead.company && (
                                                                    <p className="text-xs text-stone-500 mb-2">{lead.company}</p>
                                                                )}
                                                                {lead.estimatedValue && (
                                                                    <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 mb-2">
                                                                        <DollarSign className="h-3 w-3" />
                                                                        {lead.estimatedValue.toLocaleString()}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 text-xs text-stone-400">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span className="truncate">{lead.email}</span>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {stageLeads.length === 0 && (
                                                <p className="text-center text-stone-400 text-sm py-8">No leads in this stage</p>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div>
            </DragDropContext>
        </div>
    )
}
