'use client'

import { useState, useEffect } from 'react'
import { X, Printer, MessageSquare, Mail, Check, RefreshCw } from 'lucide-react'
import { printReceipt, isPrintAgentAvailable, ReceiptData } from '@/lib/print-agent'
import { normalizeTransactionForPrint } from '@/lib/print-utils'

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

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSent(false)
            setSending(false)
            setError('')
            setPhoneNumber('')
            setEmailAddress('')
            setSelectedOption('none')
        }
    }, [isOpen, transactionData])

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

    const handlePrint = async () => {
        setSending(true)
        setError('')

        try {
            // Check if print agent is available
            const agentAvailable = await isPrintAgentAvailable()

            if (agentAvailable) {
                // === USE SHARED NORMALIZER (single source of truth) ===
                const receiptData: ReceiptData = normalizeTransactionForPrint(
                    transactionData,
                    {
                        showDualPricing: !!(transactionData?.totalCash && transactionData?.totalCard &&
                            Number(transactionData.totalCash) !== Number(transactionData.totalCard)),
                        storeName: transactionData?.locationName || transactionData?.franchiseName || 'Store'
                    },
                    transactionData?.cashier || transactionData?.employee?.name || ''
                )

                const result = await printReceipt(receiptData)

                if (result.success) {
                    setSent(true)
                    setTimeout(() => {
                        onComplete()
                        onClose()
                    }, 1000)
                } else {
                    setError(result.error || 'Print failed')
                    // Fallback to browser print
                    window.print()
                    onComplete()
                    onClose()
                }
            } else {
                // Fallback to browser print if agent not available
                // Print agent not available - silent
                window.print()
                onComplete()
                onClose()
            }
        } catch (err) {
            console.error('Print error:', err)
            // Fallback to browser print
            window.print()
            onComplete()
            onClose()
        } finally {
            setSending(false)
        }
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
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Check className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Payment Complete!</h2>
                                <p className="text-orange-100 text-sm">
                                    Total: ${transactionData?.total?.toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleNoReceipt} className="text-white/80 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Invoice Number & Barcode for Refunds */}
                    {(transactionData?.invoiceNumber || transactionData?.transactionId) && (
                        <div className="mt-4 pt-3 border-t border-orange-400/30">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-orange-200 uppercase tracking-wider">Invoice</span>
                                <span className="font-mono text-lg text-white font-bold">
                                    #{transactionData?.invoiceNumber || transactionData?.transactionId?.slice(-8)}
                                </span>
                            </div>
                            {/* Visual Barcode Representation */}
                            <div className="mt-2 py-2 px-3 bg-white rounded-lg">
                                <div className="flex items-center justify-center gap-px h-8">
                                    {/* Generate pseudo-barcode pattern from invoice number */}
                                    {(transactionData?.invoiceNumber || transactionData?.transactionId || '00000000')
                                        .toString()
                                        .padStart(8, '0')
                                        .split('')
                                        .flatMap((char: string, i: number) => {
                                            const num = parseInt(char) || 0
                                            return [
                                                <div key={`${i}a`} className="bg-black" style={{ width: (num % 3) + 1, height: '100%' }} />,
                                                <div key={`${i}b`} className="bg-white" style={{ width: ((num + 1) % 2) + 1 }} />,
                                                <div key={`${i}c`} className="bg-black" style={{ width: ((num + 2) % 3) + 1, height: '100%' }} />,
                                                <div key={`${i}d`} className="bg-white" style={{ width: 2 }} />
                                            ]
                                        })}
                                </div>
                                <p className="text-center text-xs text-stone-500 mt-1 font-mono">
                                    {transactionData?.invoiceNumber || transactionData?.transactionId?.slice(-8)}
                                </p>
                            </div>
                            <p className="text-xs text-orange-200/70 text-center mt-1">Scan for easy returns</p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 text-center">
                        How would you like your receipt?
                    </h3>

                    {sent ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="h-8 w-8 text-orange-400" />
                            </div>
                            <p className="text-orange-400 font-semibold text-lg">Receipt Sent!</p>
                            <p className="text-stone-400 text-sm mt-1">Check your phone</p>
                        </div>
                    ) : (
                        <>
                            {/* Receipt Options */}
                            {/* Receipt Options */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                <button
                                    onClick={handleNoReceipt} // Immediate close
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all border-stone-800 bg-stone-900/50 text-stone-500 hover:bg-stone-800 hover:border-stone-600 hover:text-white`}
                                >
                                    <X className="h-6 w-6 mb-1" />
                                    <span className="text-xs font-bold">None</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('print')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'print'
                                        ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105'
                                        : 'border-blue-900/30 bg-blue-900/10 text-blue-400 hover:bg-blue-900/30 hover:border-blue-500/50'
                                        }`}
                                >
                                    <Printer className={`h-6 w-6 mb-1 ${selectedOption === 'print' ? 'text-white' : 'text-blue-400'}`} />
                                    <span className="text-xs font-bold">Print</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('sms')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'sms'
                                        ? 'border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 scale-105'
                                        : 'border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500/50'
                                        }`}
                                >
                                    <MessageSquare className={`h-6 w-6 mb-1 ${selectedOption === 'sms' ? 'text-white' : 'text-emerald-400'}`} />
                                    <span className="text-xs font-bold">Text</span>
                                </button>

                                <button
                                    onClick={() => setSelectedOption('email')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${selectedOption === 'email'
                                        ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-105'
                                        : 'border-purple-900/30 bg-purple-900/10 text-purple-400 hover:bg-purple-900/30 hover:border-purple-500/50'
                                        }`}
                                >
                                    <Mail className={`h-6 w-6 mb-1 ${selectedOption === 'email' ? 'text-white' : 'text-purple-400'}`} />
                                    <span className="text-xs font-bold">Email</span>
                                </button>
                            </div>

                            {/* SMS Phone Input */}
                            {selectedOption === 'sms' && (
                                <div className="mb-6">
                                    <label className="text-sm text-stone-400 mb-2 block text-center">Enter Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={handlePhoneChange}
                                        placeholder="(555) 123-4567"
                                        maxLength={14}
                                        className="w-full px-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-2xl text-center font-mono focus:outline-none focus:border-emerald-500 tracking-wider mb-4"
                                        readOnly // Use keypad only to prevent keyboard popup on touch
                                    />

                                    {/* Numeric Keypad */}
                                    <div className="grid grid-cols-3 gap-2 px-4">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    const clean = phoneNumber.replace(/\D/g, '')
                                                    if (clean.length < 10) {
                                                        const newVal = clean + key
                                                        // Format on fly
                                                        let formatted = newVal
                                                        if (newVal.length > 6) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3, 6)}-${newVal.slice(6)}`
                                                        else if (newVal.length > 3) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3)}`
                                                        setPhoneNumber(formatted)
                                                    }
                                                }}
                                                className="py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xl font-bold transition-colors active:scale-95"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setPhoneNumber('')}
                                            className="py-3 bg-stone-800 hover:bg-red-900/30 text-red-400 rounded-lg text-sm font-bold transition-colors active:scale-95"
                                        >
                                            CLR
                                        </button>
                                        <button
                                            onClick={() => {
                                                const clean = phoneNumber.replace(/\D/g, '')
                                                if (clean.length < 10) {
                                                    const newVal = clean + '0'
                                                    let formatted = newVal
                                                    if (newVal.length > 6) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3, 6)}-${newVal.slice(6)}`
                                                    else if (newVal.length > 3) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3)}`
                                                    setPhoneNumber(formatted)
                                                }
                                            }}
                                            className="py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xl font-bold transition-colors active:scale-95"
                                        >
                                            0
                                        </button>
                                        <button
                                            onClick={() => {
                                                const clean = phoneNumber.replace(/\D/g, '')
                                                const newVal = clean.slice(0, -1)
                                                let formatted = newVal
                                                if (newVal.length > 6) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3, 6)}-${newVal.slice(6)}`
                                                else if (newVal.length > 3) formatted = `(${newVal.slice(0, 3)}) ${newVal.slice(3)}`
                                                setPhoneNumber(formatted)
                                            }}
                                            className="py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg flex items-center justify-center transition-colors active:scale-95"
                                        >
                                            ⌫
                                        </button>
                                    </div>

                                    {error && (
                                        <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
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
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4 ${selectedOption === 'sms' ? 'bg-emerald-600 hover:bg-emerald-500' :
                                    selectedOption === 'email' ? 'bg-purple-600 hover:bg-purple-500' :
                                        selectedOption === 'print' ? 'bg-blue-600 hover:bg-blue-500' :
                                            'bg-stone-800 hover:bg-stone-700 border border-stone-700'
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
                                    'Close / No Receipt'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

