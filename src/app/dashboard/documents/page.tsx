'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { FileText, Upload, Search, Download, Trash2, Filter, X } from 'lucide-react'

type Document = {
    id: string
    name: string
    type: string
    size: string
    uploadedAt: string
    url: string
}

export default function DocumentsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('ALL')

    useEffect(() => {
        if (status === 'authenticated') {
            fetchDocuments()
        }
    }, [status])

    async function fetchDocuments() {
        try {
            const res = await fetch('/api/documents')
            if (res.ok) {
                const data = await res.json()
                setDocuments(data)
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === 'ALL' || doc.type === filterType
        return matchesSearch && matchesType
    })

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
                    <p className="text-stone-400">Manage contracts, licenses, and files</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Upload className="h-5 w-5" />
                    Upload Document
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-stone-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="ALL">All Types</option>
                        <option value="CONTRACT">Contracts</option>
                        <option value="LICENSE">Licenses</option>
                        <option value="REPORT">Reports</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
            </div>

            {/* Documents List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-stone-400 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Size</th>
                            <th className="px-6 py-4 font-medium">Uploaded</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredDocs.map((doc) => (
                            <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <span className="text-white font-medium">{doc.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-stone-800 rounded-full text-xs text-stone-300 border border-stone-700">
                                        {doc.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-stone-400 text-sm">{doc.size}</td>
                                <td className="px-6 py-4 text-stone-400 text-sm">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors">
                                            <Download className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 hover:bg-red-900/20 rounded-lg text-stone-400 hover:text-red-400 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredDocs.length === 0 && (
                    <div className="p-12 text-center">
                        <FileText className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
                        <p className="text-stone-400">Upload a document to get started</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Upload Document</h2>
                            <button onClick={() => setShowUploadModal(false)} className="text-stone-400 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-stone-700 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-500/5 transition-colors cursor-pointer">
                                <Upload className="h-8 w-8 text-stone-500 mx-auto mb-3" />
                                <p className="text-stone-300 font-medium">Click to upload or drag and drop</p>
                                <p className="text-stone-500 text-sm mt-1">PDF, DOCX, JPG up to 10MB</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Document Type</label>
                                <select className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                    <option value="CONTRACT">Contract</option>
                                    <option value="LICENSE">License</option>
                                    <option value="REPORT">Report</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowUploadModal(false)
                                        alert('Upload simulated!')
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                                >
                                    Upload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

