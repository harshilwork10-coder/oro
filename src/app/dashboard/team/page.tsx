'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { Users, Mail, Plus, Calendar, Building2 } from "lucide-react"

type Agent = {
    id: string
    name: string
    email: string
    clientsCount: number
    createdAt: string
}

export default function MyAgentsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newAgent, setNewAgent] = useState({ name: '', email: '' })

    async function fetchAgents() {
        try {
            const response = await fetch('/api/admin/agents')
            if (response.ok) {
                const data = await response.json()
                setAgents(data)
            }
        } catch (error) {
            console.error('Error fetching agents:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAddAgent() {
        if (!newAgent.name || !newAgent.email) return

        try {
            const res = await fetch('/api/admin/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAgent)
            })

            if (res.ok) {
                setShowAddModal(false)
                setNewAgent({ name: '', email: '' })
                fetchAgents()
            }
        } catch (error) {
            console.error('Error adding agent:', error)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAgents()
        }
    }, [status])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Agents</h1>
                    <p className="text-stone-400 mt-2">Manage your sales team</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium">
                    <Plus className="h-5 w-5" />
                    Add Agent
                </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <div key={agent.id} className="glass-panel p-6 rounded-2xl hover:border-purple-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/20">
                                <Users className="h-6 w-6 text-orange-400" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
                                Active
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-stone-100 mb-1 relative z-10">{agent.name}</h3>
                        <p className="text-sm text-stone-400 mb-6 relative z-10">{agent.email}</p>

                        <div className="space-y-3 pt-4 border-t border-stone-800 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-500 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Clients
                                </span>
                                <span className="font-bold text-stone-200">{agent.clientsCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-500 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Joined
                                </span>
                                <span className="text-stone-200">{new Date(agent.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Users className="h-16 w-16 text-stone-700 mx-auto mb-4" />
                        <p className="text-stone-400 text-lg">No agents yet</p>
                        <p className="text-stone-500 text-sm mt-2">Add your first sales agent to get started</p>
                    </div>
                )}
            </div>

            {/* Add Agent Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-8 rounded-2xl max-w-md w-full">
                        <h2 className="text-2xl font-bold text-stone-100 mb-6">Add New Agent</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newAgent.name}
                                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-orange-500 focus:outline-none"
                                    placeholder="Agent name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newAgent.email}
                                    onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 focus:border-orange-500 focus:outline-none"
                                    placeholder="agent@example.com"
                                />
                            </div>

                            <p className="text-xs text-stone-500">
                                An invite link will be generated and sent to this email
                            </p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false)
                                    setNewAgent({ name: '', email: '' })
                                }}
                                className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAgent}
                                disabled={!newAgent.name || !newAgent.email}
                                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Add Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

