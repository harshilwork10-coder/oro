'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { FileText, Upload, Lock, FolderOpen } from 'lucide-react'

export default function DocumentsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"></div>
                        <div className="relative h-20 w-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/20">
                            <FileText className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-stone-100 mb-2">Document Management</h1>
                    <p className="text-stone-400">Coming Soon</p>
                </div>

                <div className="glass-panel p-8 rounded-2xl mb-6">
                    <h2 className="text-xl font-bold text-stone-100 mb-4">Planned Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <FolderOpen className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Document Library</h3>
                                <p className="text-sm text-stone-400 mt-1">Centralized storage for all documents</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <Upload className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">File Upload</h3>
                                <p className="text-sm text-stone-400 mt-1">Upload contracts, manuals, and policies</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <Lock className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Access Control</h3>
                                <p className="text-sm text-stone-400 mt-1">Control who can view each document</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <FileText className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Version Control</h3>
                                <p className="text-sm text-stone-400 mt-1">Track document versions and changes</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                    <p className="text-sm text-purple-200">
                        <strong>Note:</strong> Document management requires file storage integration (AWS S3, Google Cloud Storage, etc.) and will be implemented in a future update.
                    </p>
                </div>
            </div>
        </div>
    )
}
