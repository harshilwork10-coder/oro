import { useState, useEffect, useRef } from 'react'
import { X, Monitor, CheckCircle, AlertCircle, Loader2, XCircle, Search } from 'lucide-react'
import { PaxTerminal, PaxResponse } from '@/lib/pax/pax-terminal'
import TerminalSetupModal from './TerminalSetupModal'

interface PaxPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (response: PaxResponse) => void
    amount: number
    invoiceNumber: string
}

export default function PaxPaymentModal({ isOpen, onClose, onSuccess, amount, invoiceNumber }: PaxPaymentModalProps) {
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'CANCELLING'>('IDLE')
    const [message, setMessage] = useState('Loading terminal settings...')
    const [terminalIp, setTerminalIp] = useState('')
    const [terminalPort, setTerminalPort] = useState('10009')
    const [settingsLoaded, setSettingsLoaded] = useState(false)
    const [showTerminalSetup, setShowTerminalSetup] = useState(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Load PAX settings from database when modal opens
    useEffect(() => {
        if (isOpen && !settingsLoaded) {
            loadTerminalSettings()
        }
    }, [isOpen])

    const loadTerminalSettings = async () => {
        try {
            // Fetch PAX settings from current user's location
            const res = await fetch('/api/pax/settings')
            if (res.ok) {
                const data = await res.json()
                if (data.paxTerminalIP) {
                    setTerminalIp(data.paxTerminalIP)
                    setTerminalPort(data.paxTerminalPort || '10009')
                    setSettingsLoaded(true)
                    setMessage('Ready to process payment')
                    // Auto-start after settings loaded
                    setTimeout(() => handleProcessPayment(data.paxTerminalIP, data.paxTerminalPort || '10009'), 500)
                } else {
                    setMessage('Card terminal not found. Click "Find Terminal" to set up.')
                    setStatus('ERROR')
                }
            } else {
                setMessage('Failed to load terminal settings')
                setStatus('ERROR')
            }
        } catch (error) {
            console.error('Error loading PAX settings:', error)
            setMessage('Failed to load terminal settings')
            setStatus('ERROR')
        }
    }

    // Handle terminal found from setup modal
    const handleTerminalFound = (ip: string) => {
        setTerminalIp(ip)
        setTerminalPort('10009')
        setSettingsLoaded(true)
        setShowTerminalSetup(false)
        setStatus('IDLE')
        setMessage('Terminal configured! Retrying payment...')
        // Auto-start payment with new terminal
        setTimeout(() => handleProcessPayment(ip, '10009'), 500)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    const handleProcessPayment = async (ip?: string, port?: string) => {
        const useIp = ip || terminalIp
        const usePort = port || terminalPort

        if (!useIp) {
            setStatus('ERROR')
            setMessage('PAX terminal IP not configured')
            return
        }

        setStatus('PROCESSING')
        setMessage('Initializing terminal...')

        // Create abort controller for this request
        abortControllerRef.current = new AbortController()

        try {
            const terminal = new PaxTerminal({
                ip: useIp,
                port: usePort,
                timeout: 120000 // 2 minutes
            })

            setMessage('Please follow instructions on the terminal...')

            const response = await terminal.processSale({
                amount: amount,
                invoiceNumber: invoiceNumber
            })

            if (response.responseCode === '000000') {
                setStatus('SUCCESS')
                setMessage('Payment Approved!')

                // Report terminal IP to backend so Provider can see it
                try {
                    await fetch('/api/terminals/report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            terminalIP: useIp,
                            terminalPort: usePort,
                            status: 'connected',
                            mid: response.hostInformation // MID might be in response
                        })
                    })
                } catch (e) {
                    // Non-critical, don't fail the payment
                    console.log('Failed to report terminal:', e)
                }

                setTimeout(() => {
                    onSuccess(response)
                }, 1500)
            } else {
                setStatus('ERROR')
                setMessage(`Payment Failed: ${response.responseMessage} (${response.responseCode})`)
            }

        } catch (error: any) {
            // Don't show error if we cancelled
            if (status === 'CANCELLING') {
                setStatus('IDLE')
                setMessage('Transaction cancelled')
                return
            }
            console.error('PAX Error:', error)
            setStatus('ERROR')
            setMessage(error.message || 'Failed to communicate with PAX terminal')
        }
    }

    const handleCancelTransaction = async () => {
        setStatus('CANCELLING')
        setMessage('Cancelling transaction...')

        // Abort any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        try {
            // Send cancel command to PAX terminal
            await fetch('/api/pax/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: terminalIp,
                    port: terminalPort
                })
            })
        } catch (error) {
            console.error('Cancel error:', error)
        }

        // Reset to idle state
        setTimeout(() => {
            setStatus('IDLE')
            setMessage('Transaction cancelled - Ready for new payment')
        }, 1000)
    }

    const handleClose = () => {
        if (status === 'PROCESSING') {
            handleCancelTransaction()
        }
        setStatus('IDLE')
        setMessage('Loading terminal settings...')
        setSettingsLoaded(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-stone-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Monitor className="h-6 w-6 text-emerald-500" />
                        PAX Terminal
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-stone-400 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Display */}
                    <div className="text-center">
                        <p className="text-stone-400 text-sm mb-1">Total Amount</p>
                        <p className="text-4xl font-bold text-white">${amount.toFixed(2)}</p>
                    </div>

                    {/* Status Display */}
                    <div className={`rounded-xl p-6 border flex flex-col items-center justify-center gap-3 text-center min-h-[160px] transition-colors ${status === 'IDLE' ? 'bg-stone-950 border-stone-800' :
                        status === 'PROCESSING' ? 'bg-blue-900/20 border-blue-500/30' :
                            status === 'CANCELLING' ? 'bg-amber-900/20 border-amber-500/30' :
                                status === 'SUCCESS' ? 'bg-emerald-900/20 border-emerald-500/30' :
                                    'bg-red-900/20 border-red-500/30'
                        }`}>
                        {status === 'IDLE' && <Monitor className="h-12 w-12 text-stone-600" />}
                        {status === 'PROCESSING' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
                        {status === 'CANCELLING' && <XCircle className="h-12 w-12 text-amber-500 animate-pulse" />}
                        {status === 'SUCCESS' && <CheckCircle className="h-12 w-12 text-emerald-500" />}
                        {status === 'ERROR' && <AlertCircle className="h-12 w-12 text-red-500" />}

                        <p className={`font-medium ${status === 'IDLE' ? 'text-stone-400' :
                            status === 'PROCESSING' ? 'text-blue-200' :
                                status === 'CANCELLING' ? 'text-amber-200' :
                                    status === 'SUCCESS' ? 'text-emerald-200' :
                                        'text-red-200'
                            }`}>
                            {message}
                        </p>
                    </div>

                    {/* CANCEL Button - Show during PROCESSING */}
                    {status === 'PROCESSING' && (
                        <button
                            onClick={handleCancelTransaction}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg transition-all border-2 border-red-500 shadow-lg"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <XCircle className="h-5 w-5" />
                                Cancel Transaction
                            </span>
                        </button>
                    )}

                    {/* Show terminal info when loaded */}
                    {settingsLoaded && (status === 'IDLE' || status === 'ERROR') && (
                        <div className="text-center text-xs text-stone-500">
                            Terminal: {terminalIp}:{terminalPort}
                        </div>
                    )}

                    {/* Action Button */}
                    {(status === 'IDLE' || status === 'ERROR') && settingsLoaded && (
                        <button
                            onClick={() => handleProcessPayment()}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20"
                        >
                            Process Payment
                        </button>
                    )}

                    {/* Find Terminal Button - When no terminal configured */}
                    {status === 'ERROR' && !settingsLoaded && (
                        <button
                            onClick={() => setShowTerminalSetup(true)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Search className="h-5 w-5" />
                            Find Terminal
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Setup Modal */}
            <TerminalSetupModal
                isOpen={showTerminalSetup}
                onClose={() => setShowTerminalSetup(false)}
                onSuccess={handleTerminalFound}
            />
        </div>
    )
}

