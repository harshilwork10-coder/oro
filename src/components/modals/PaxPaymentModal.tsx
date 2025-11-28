import { useState, useEffect } from 'react'
import { X, Monitor, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { PaxTerminal, PaxResponse } from '@/lib/pax/pax-terminal'

interface PaxPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (response: PaxResponse) => void
    amount: number
    invoiceNumber: string
}

export default function PaxPaymentModal({ isOpen, onClose, onSuccess, amount, invoiceNumber }: PaxPaymentModalProps) {
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE')
    const [message, setMessage] = useState('Ready to process payment')
    const [terminalIp, setTerminalIp] = useState('127.0.0.1')
    const [terminalPort, setTerminalPort] = useState('10009')

    useEffect(() => {
        // Load settings from localStorage if available
        const savedIp = localStorage.getItem('pax_ip')
        const savedPort = localStorage.getItem('pax_port')
        if (savedIp) setTerminalIp(savedIp)
        if (savedPort) setTerminalPort(savedPort)
    }, [])

    const handleProcessPayment = async () => {
        setStatus('PROCESSING')
        setMessage('Initializing terminal...')

        try {
            const terminal = new PaxTerminal({
                ip: terminalIp,
                port: terminalPort,
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
                setTimeout(() => {
                    onSuccess(response)
                }, 1500)
            } else {
                setStatus('ERROR')
                setMessage(`Payment Failed: ${response.responseMessage} (${response.responseCode})`)
            }

        } catch (error: any) {
            console.error('PAX Error:', error)
            setStatus('ERROR')
            setMessage(error.message || 'Failed to communicate with terminal')
        }
    }

    const saveSettings = () => {
        localStorage.setItem('pax_ip', terminalIp)
        localStorage.setItem('pax_port', terminalPort)
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
                        onClick={onClose}
                        disabled={status === 'PROCESSING'}
                        className="text-stone-400 hover:text-white disabled:opacity-50"
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
                                status === 'SUCCESS' ? 'bg-emerald-900/20 border-emerald-500/30' :
                                    'bg-red-900/20 border-red-500/30'
                        }`}>
                        {status === 'IDLE' && <Monitor className="h-12 w-12 text-stone-600" />}
                        {status === 'PROCESSING' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
                        {status === 'SUCCESS' && <CheckCircle className="h-12 w-12 text-emerald-500" />}
                        {status === 'ERROR' && <AlertCircle className="h-12 w-12 text-red-500" />}

                        <p className={`font-medium ${status === 'IDLE' ? 'text-stone-400' :
                                status === 'PROCESSING' ? 'text-blue-200' :
                                    status === 'SUCCESS' ? 'text-emerald-200' :
                                        'text-red-200'
                            }`}>
                            {message}
                        </p>
                    </div>

                    {/* Settings (Only visible when IDLE or ERROR) */}
                    {(status === 'IDLE' || status === 'ERROR') && (
                        <div className="space-y-3 pt-4 border-t border-stone-800">
                            <p className="text-xs font-medium text-stone-500 uppercase">Terminal Settings</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs text-stone-400 mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        value={terminalIp}
                                        onChange={(e) => {
                                            setTerminalIp(e.target.value)
                                            saveSettings()
                                        }}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                        placeholder="127.0.0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-400 mb-1">Port</label>
                                    <input
                                        type="text"
                                        value={terminalPort}
                                        onChange={(e) => {
                                            setTerminalPort(e.target.value)
                                            saveSettings()
                                        }}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                        placeholder="10009"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {status === 'IDLE' || status === 'ERROR' ? (
                        <button
                            onClick={handleProcessPayment}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20"
                        >
                            Process Payment
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
