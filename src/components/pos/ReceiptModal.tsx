'use client'

import { useState } from 'react'
import { X, Printer, MessageSquare, Mail, Check, RefreshCw } from 'lucide-react'

interface ReceiptModalProps {
    isOpen: boolean
    onClose: () => void
    transactionData: any
    onComplete: () => void
}

export default function ReceiptModal({ isOpen, onClose, transactionData, onComplete }: ReceiptModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('')
    const [emailAddress, setEmailAddress] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [selectedOption, setSelectedOption] = useState<'none' | 'print' | 'sms' | 'email'>('none')

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '')
        if (numbers.length <= 3) return numbers
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value)
        setPhoneNumber(formatted)
        setError('')
    }

    const sendSMSReceipt = async () => {
        const cleanPhone = phoneNumber.replace(/\D/g, '')
        if (cleanPhone.length < 10) {
            setError('Please enter a valid 10-digit phone number')
            return
        }

        setSending(true)
        setError('')
        try {
            const res = await fetch('/api/pos/sms-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: cleanPhone,
                    transactionData
                })
            })

            const data = await res.json()
            if (res.ok) {
                setSent(true)
                setTimeout(() => {
                    onComplete()
                    onClose()
                }, 1500)
            } else {
                setError(data.error || 'Failed to send')
            }
        } catch (err) {
            setError('Failed to send receipt')
        } finally {
            setSending(false)
        }
    }

    const sendEmailReceipt = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(emailAddress)) {
            setError('Please enter a valid email address')
            return
        }

        setSending(true)
        setError('')
        try {
            const res = await fetch('/api/receipts/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: transactionData?.id,
                    method: 'email',
                    destination: emailAddress
                })
            })

            const data = await res.json()
            if (res.ok) {
                setSent(true)
                setTimeout(() => {
                    onComplete()
                    onClose()
                }, 1500)
            } else {
                setError(data.error || 'Failed to send')
            }
        } catch (err) {
            setError('Failed to send receipt')
        } finally {
            setSending(false)
        }
    }

    const handlePrint = () => {
        // Trigger print dialog
        window.print()
        onComplete()
        onClose()
    }

    const handleNoReceipt = () => {
        onComplete()
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Check className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Payment Complete!</h2>
                                <p className="text-emerald-100 text-sm">
                                    Total: ${transactionData?.total?.toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleNoReceipt} className="text-white/80 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 text-center">
                        How would you like your receipt?
                    </h3>

                    {sent ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="h-8 w-8 text-emerald-400" />
                            </div>
                            <p className="text-emerald-400 font-semibold text-lg">Receipt Sent!</p>
                            <p className="text-stone-400 text-sm mt-1">Check your phone</p>
                        </div>
                    ) : (
                        <>
                            {/* Receipt Options */}
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                <button
                                    onClick={() => setSelectedOption('none')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'none'
                                        ? 'border-stone-500 bg-stone-800'
                                        : 'border-stone-700 hover:border-stone-600'
                                        }`}
                                >
                                    <X className={`h-6 w-6 mb-1 ${selectedOption === 'none' ? 'text-stone-300' : 'text-stone-500'}`} />
                                    <span className="text-xs font-medium">None</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('print')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'print'
                                        ? 'border-blue-500 bg-blue-500/20'
                                        : 'border-stone-700 hover:border-stone-600'
                                        }`}
                                >
                                    <Printer className={`h-6 w-6 mb-1 ${selectedOption === 'print' ? 'text-blue-400' : 'text-stone-500'}`} />
                                    <span className="text-xs font-medium">Print</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('sms')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'sms'
                                        ? 'border-emerald-500 bg-emerald-500/20'
                                        : 'border-stone-700 hover:border-stone-600'
                                        }`}
                                >
                                    <MessageSquare className={`h-6 w-6 mb-1 ${selectedOption === 'sms' ? 'text-emerald-400' : 'text-stone-500'}`} />
                                    <span className="text-xs font-medium">Text</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('email')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'email'
                                        ? 'border-purple-500 bg-purple-500/20'
                                        : 'border-stone-700 hover:border-stone-600'
                                        }`}
                                >
                                    <Mail className={`h-6 w-6 mb-1 ${selectedOption === 'email' ? 'text-purple-400' : 'text-stone-500'}`} />
                                    <span className="text-xs font-medium">Email</span>
                                </button>
                            </div>

                            {/* SMS Phone Input */}
                            {selectedOption === 'sms' && (
                                <div className="mb-6">
                                    <label className="text-sm text-stone-400 mb-2 block">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={handlePhoneChange}
                                        placeholder="(555) 123-4567"
                                        maxLength={14}
                                        className="w-full px-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-xl text-center font-mono focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                    />
                                    {error && (
                                        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
                                    )}
                                </div>
                            )}

                            {/* Email Input */}
                            {selectedOption === 'email' && (
                                <div className="mb-6">
                                    <label className="text-sm text-stone-400 mb-2 block">Email Address</label>
                                    <input
                                        type="email"
                                        value={emailAddress}
                                        onChange={(e) => { setEmailAddress(e.target.value); setError('') }}
                                        placeholder="customer@email.com"
                                        className="w-full px-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-lg text-center focus:outline-none focus:border-purple-500"
                                        autoFocus
                                    />
                                    {error && (
                                        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
                                    )}
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={
                                    selectedOption === 'sms' ? sendSMSReceipt :
                                        selectedOption === 'email' ? sendEmailReceipt :
                                            selectedOption === 'print' ? handlePrint :
                                                handleNoReceipt
                                }
                                disabled={sending ||
                                    (selectedOption === 'sms' && phoneNumber.replace(/\D/g, '').length < 10) ||
                                    (selectedOption === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress))
                                }
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${selectedOption === 'sms' ? 'bg-emerald-600 hover:bg-emerald-500' :
                                        selectedOption === 'email' ? 'bg-purple-600 hover:bg-purple-500' :
                                            selectedOption === 'print' ? 'bg-blue-600 hover:bg-blue-500' :
                                                'bg-stone-700 hover:bg-stone-600'
                                    }`}
                            >
                                {sending ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                        Sending...
                                    </>
                                ) : selectedOption === 'sms' ? (
                                    <>
                                        <MessageSquare className="h-5 w-5" />
                                        Send Receipt
                                    </>
                                ) : selectedOption === 'email' ? (
                                    <>
                                        <Mail className="h-5 w-5" />
                                        Send Receipt
                                    </>
                                ) : selectedOption === 'print' ? (
                                    <>
                                        <Printer className="h-5 w-5" />
                                        Print Receipt
                                    </>
                                ) : (
                                    'Done'
                                )}
                            </button>

                            {/* Skip link */}
                            <button
                                onClick={handleNoReceipt}
                                className="w-full text-center text-stone-500 hover:text-stone-400 text-sm mt-4"
                            >
                                Skip receipt
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
