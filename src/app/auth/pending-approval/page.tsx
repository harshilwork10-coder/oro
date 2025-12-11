'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Loader2, CheckCircle, Clock, AlertCircle, Upload, FileText, RefreshCw } from 'lucide-react'
import OronexLogo from '@/components/ui/OronexLogo'

export default function PendingApprovalPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
    const [documents, setDocuments] = useState<{ voidCheck: boolean, dl: boolean, feinLetter: boolean }>({ voidCheck: false, dl: false, feinLetter: false })
    const [needToDiscuss, setNeedToDiscuss] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)

    useEffect(() => {
        checkStatus()

        // Poll every 10 seconds for status changes
        const interval = setInterval(() => {
            checkStatus()
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/auth/status')
            if (res.ok) {
                const data = await res.json()
                setStatus(data.status)
                setDocuments(data.documents || {})
                setNeedToDiscuss(data.needToDiscussProcessing)

                if (data.status === 'APPROVED') {
                    // Use window.location.href to force full page reload and session refresh
                    window.location.href = '/dashboard'
                }
            }
        } catch (error) {
            console.error('Error checking status:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        if (!e.target.files?.[0]) return

        setUploading(type)
        const file = e.target.files[0]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', type)

        try {
            // 1. Upload to S3 (Mock/Real)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            if (!uploadRes.ok) throw new Error('Upload failed')
            const uploadData = await uploadRes.json()

            // 2. Update Franchisor Record
            const updateRes = await fetch('/api/franchisors/update-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [type === 'voidCheck' ? 'voidCheckUrl' : type === 'dl' ? 'driverLicenseUrl' : 'feinLetterUrl']: uploadData.s3Key
                })
            })

            if (updateRes.ok) {
                setDocuments(prev => ({ ...prev, [type]: true }))
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload document')
        } finally {
            setUploading(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8">
                <img src="/Oronex-logo.png" alt="Oronex" className="h-24 object-contain" />
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-lg w-full overflow-hidden">
                <div className="p-8 text-center border-b border-stone-100">
                    <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                        status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                        }`}>
                        {status === 'APPROVED' ? <CheckCircle className="h-8 w-8" /> :
                            status === 'REJECTED' ? <AlertCircle className="h-8 w-8" /> :
                                <Clock className="h-8 w-8" />}
                    </div>

                    <h1 className="text-2xl font-bold text-stone-900 mb-2">
                        {status === 'APPROVED' ? 'Account Approved!' :
                            status === 'REJECTED' ? 'Application Rejected' :
                                'Under Review'}
                    </h1>

                    <p className="text-stone-600">
                        {status === 'APPROVED' ? (
                            <>
                                Redirecting you to your dashboard...
                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="block mx-auto mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                            </>
                        ) : status === 'REJECTED' ? 'Please contact support for more information.' :
                            'Your account is currently pending approval from an administrator.'}
                    </p>
                </div>

                {status === 'PENDING' && (
                    <div className="p-8 bg-stone-50/50">
                        {!needToDiscuss && (!documents.voidCheck || !documents.dl || !documents.feinLetter) ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm mb-6">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>To speed up approval, please complete your document uploads.</p>
                                </div>

                                {[
                                    { id: 'voidCheck', label: 'Voided Check', done: documents.voidCheck },
                                    { id: 'dl', label: "Driver's License", done: documents.dl },
                                    { id: 'feinLetter', label: 'FEIN Letter', done: documents.feinLetter },
                                ].map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${doc.done ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                                                {doc.done ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                            </div>
                                            <span className={`font-medium ${doc.done ? 'text-stone-900' : 'text-stone-600'}`}>{doc.label}</span>
                                        </div>

                                        {!doc.done && (
                                            <label className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${uploading === doc.id ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                                                {uploading === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                                                <input type="file" className="hidden" disabled={!!uploading} onChange={(e) => handleFileUpload(e, doc.id)} />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm flex items-center gap-3 justify-center">
                                    <CheckCircle className="h-5 w-5" />
                                    <p>All required information submitted.</p>
                                </div>
                                <p className="text-sm text-stone-500">We will notify you via email once your account is active.</p>
                                <button onClick={checkStatus} className="text-purple-600 text-sm font-medium hover:underline flex items-center justify-center gap-2 mx-auto">
                                    <RefreshCw className="h-3 w-3" /> Check Status Again
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
