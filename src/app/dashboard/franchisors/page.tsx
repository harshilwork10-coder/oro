'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { Building2, Users, Mail, Calendar, Plus } from "lucide-react"
import AddFranchisorModal from "@/components/modals/AddFranchisorModal"

type Franchisor = {
    id: string
    name: string
    owner: {
        name: string
        email: string
    }
    _count: {
        franchises: number
    }
    createdAt: string
}

export default function FranchisorsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [franchisors, setFranchisors] = useState<Franchisor[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    async function fetchFranchisors() {
        try {
            // We need to create this endpoint or use an existing one
            // For now, let's assume we'll create it or mock it
            const response = await fetch('/api/franchisors')
            if (response.ok) {
                const data = await response.json()
                setFranchisors(data)
            }
        } catch (error) {
            console.error('Error fetching franchisors:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFranchisors()
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Franchisors</h1>
                    <p className="text-stone-400 mt-2">Manage franchise companies and brands</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-105 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Add Franchisor
                </button>
            </div>

            <AddFranchisorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchFranchisors()
                    setIsModalOpen(false)
                }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {franchisors.map((franchisor) => (
                    <div key={franchisor.id} className="glass-panel p-6 rounded-2xl hover:border-purple-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                <Building2 className="h-6 w-6 text-purple-400" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20 backdrop-blur-md">
                                Active
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-stone-100 mb-1 relative z-10 group-hover:text-purple-400 transition-colors">{franchisor.name}</h3>
                        <p className="text-sm text-stone-400 mb-6 relative z-10">Owner: {franchisor.owner?.name}</p>

                        <div className="space-y-3 pt-4 border-t border-stone-800 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-500 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Franchisees
                                </span>
                                <span className="font-bold text-stone-200">{franchisor._count?.franchises || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-500 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email
                                </span>
                                <span className="text-stone-200 truncate max-w-[150px]">{franchisor.owner?.email}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-500 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Joined
                                </span>
                                <span className="text-stone-200">{new Date(franchisor.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
