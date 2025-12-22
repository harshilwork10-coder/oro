'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, FileText, PenTool, Loader2 } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function ContractPage() {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [signed, setSigned] = useState(false)
    const [error, setError] = useState('')

    const handleSign = async () => {
        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/franchisor/requests/${params.id}/sign`, {
                method: 'POST'
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to sign contract')
            }

            setSigned(true)
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            setTimeout(() => {
                router.push('/dashboard/terminals')
            }, 3000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (signed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-2xl max-w-lg w-full text-center animate-in fade-in zoom-in-95">
                    <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-stone-100 mb-2">Welcome to the Family!</h1>
                    <p className="text-stone-400 mb-6">
                        Your contract has been signed. Your licenses are now active and your hardware is being prepared for shipment.
                    </p>
                    <p className="text-sm text-stone-500">Redirecting to dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel max-w-4xl w-full rounded-2xl overflow-hidden flex flex-col md:flex-row">
                {/* Contract Preview */}
                <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-stone-800 bg-stone-900/30">
                    <div className="flex items-center gap-3 mb-6">
                        <FileText className="h-6 w-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-stone-100">License Agreement</h2>
                    </div>

                    <div className="prose prose-invert prose-sm max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        <p><strong>SOFTWARE LICENSE AND HARDWARE AGREEMENT</strong></p>
                        <p>This Agreement is entered into between Oro POS ("Licensor") and the Customer ("Licensee").</p>

                        <h4>1. GRANT OF LICENSE</h4>
                        <p>Licensor grants Licensee a non-exclusive, non-transferable license to use the Oronex POS software for the number of stations specified in the Order.</p>

                        <h4>2. FEES AND PAYMENT</h4>
                        <p>Licensee agrees to pay the monthly subscription fees associated with the active stations. Fees are billed automatically to the payment method on file.</p>

                        <h4>3. HARDWARE</h4>
                        <p>Hardware provided by Licensor remains the property of Licensor unless purchased outright. Licensee is responsible for any damage to hardware beyond normal wear and tear.</p>

                        <h4>4. TERM AND TERMINATION</h4>
                        <p>This Agreement is effective upon acceptance and continues until terminated by either party. Licensor may terminate immediately for non-payment or violation of terms.</p>

                        <p className="text-stone-500 italic mt-8">By clicking "Accept & Sign", you agree to be bound by these terms.</p>
                    </div>
                </div>

                {/* Action Panel */}
                <div className="w-full md:w-80 p-8 flex flex-col justify-center bg-stone-900/50">
                    <div className="mb-8 text-center">
                        <div className="h-16 w-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                            <PenTool className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-stone-100">Sign & Activate</h3>
                        <p className="text-sm text-stone-400 mt-2">
                            Accept the terms to instantly generate your license keys.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSign}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg hover:shadow-emerald-900/20 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Accept & Sign'}
                    </button>

                    <p className="text-xs text-stone-500 text-center mt-4">
                        IP Address: {typeof window !== 'undefined' ? '127.0.0.1' : ''} <br />
                        Timestamp: {new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    )
}
