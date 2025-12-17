'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Shield, AlertTriangle, CheckCircle, XCircle, Scan, UserX } from 'lucide-react'

interface IDCheckModalProps {
    isOpen: boolean
    productName: string
    minimumAge: number
    onVerified: () => void
    onSkip: () => void
    onCancel: () => void
}

// Parse PDF417 barcode from US Driver's License
// Format varies by state but generally includes DOB
function parseLicenseBarcode(barcode: string): { dob?: Date; firstName?: string; lastName?: string } | null {
    try {
        // US Driver License PDF417 format has DOB in format MMDDYYYY after "DBB"
        const dobMatch = barcode.match(/DBB(\d{8})/i) || barcode.match(/DAQ.*?(\d{8})/i)

        if (dobMatch) {
            const dobStr = dobMatch[1]
            const month = parseInt(dobStr.substring(0, 2))
            const day = parseInt(dobStr.substring(2, 4))
            const year = parseInt(dobStr.substring(4, 8))

            const dob = new Date(year, month - 1, day)

            // Extract name if available
            const firstNameMatch = barcode.match(/DAC([A-Z]+)/i)
            const lastNameMatch = barcode.match(/DCS([A-Z]+)/i)

            return {
                dob,
                firstName: firstNameMatch?.[1],
                lastName: lastNameMatch?.[1]
            }
        }

        return null
    } catch {
        return null
    }
}

function calculateAge(dob: Date): number {
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
    }

    return age
}

export default function IDCheckModal({
    isOpen,
    productName,
    minimumAge,
    onVerified,
    onSkip,
    onCancel
}: IDCheckModalProps) {
    const [scanInput, setScanInput] = useState('')
    const [status, setStatus] = useState<'waiting' | 'valid' | 'underage' | 'expired' | 'error'>('waiting')
    const [customerAge, setCustomerAge] = useState<number | null>(null)
    const [customerName, setCustomerName] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setStatus('waiting')
            setScanInput('')
            setCustomerAge(null)
            setCustomerName(null)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Auto-process when barcode is scanned (ends with Enter)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && scanInput.length > 10) {
            processBarcode(scanInput)
        }
    }

    const processBarcode = (barcode: string) => {
        const parsed = parseLicenseBarcode(barcode)

        if (!parsed || !parsed.dob) {
            setStatus('error')
            return
        }

        const age = calculateAge(parsed.dob)
        setCustomerAge(age)

        if (parsed.firstName && parsed.lastName) {
            setCustomerName(`${parsed.firstName} ${parsed.lastName}`)
        }

        // Check if ID is expired (simple check - DOB > 100 years ago unlikely)
        if (parsed.dob.getFullYear() < 1900) {
            setStatus('expired')
            return
        }

        if (age >= minimumAge) {
            setStatus('valid')
            // Auto-proceed after 1 second
            setTimeout(() => onVerified(), 1000)
        } else {
            setStatus('underage')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-stone-900 rounded-2xl w-full max-w-lg border border-stone-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-red-600 p-4 flex items-center gap-3">
                    <Shield className="h-8 w-8" />
                    <div>
                        <h2 className="text-xl font-bold">Age Verification Required</h2>
                        <p className="text-red-100 text-sm">Must be {minimumAge}+ to purchase</p>
                    </div>
                    <button onClick={onCancel} className="ml-auto p-2 hover:bg-red-700 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Product Info */}
                <div className="p-6 border-b border-stone-700 bg-stone-800/50">
                    <p className="text-stone-400 text-sm">Product requires ID check:</p>
                    <p className="text-xl font-semibold mt-1">{productName}</p>
                </div>

                {/* Scan Area */}
                <div className="p-6">
                    {status === 'waiting' && (
                        <>
                            <div className="flex items-center gap-3 mb-4">
                                <Scan className="h-6 w-6 text-orange-400" />
                                <span className="font-medium">Scan ID barcode with 2D scanner</span>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Waiting for barcode scan..."
                                className="w-full px-4 py-4 bg-stone-800 border-2 border-dashed border-stone-600 rounded-xl text-lg text-center focus:border-orange-500 transition-colors"
                                autoFocus
                            />
                            <p className="text-stone-500 text-sm text-center mt-3">
                                Scan the PDF417 barcode on the back of driver's license
                            </p>
                        </>
                    )}

                    {status === 'valid' && (
                        <div className="text-center py-4">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                            <p className="text-2xl font-bold text-green-400">ID VERIFIED</p>
                            {customerName && <p className="text-stone-400 mt-1">{customerName}</p>}
                            <p className="text-stone-400 mt-1">Age: {customerAge} (Minimum: {minimumAge})</p>
                        </div>
                    )}

                    {status === 'underage' && (
                        <div className="text-center py-4">
                            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                            <p className="text-2xl font-bold text-red-400">UNDER AGE</p>
                            {customerName && <p className="text-stone-400 mt-1">{customerName}</p>}
                            <p className="text-stone-400 mt-1">Age: {customerAge} (Minimum: {minimumAge})</p>
                            <p className="text-red-400 text-sm mt-3">Cannot sell this product to customer</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-4">
                            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
                            <p className="text-xl font-bold text-yellow-400">Couldn't Read ID</p>
                            <p className="text-stone-400 mt-2">Try scanning again or manually verify</p>
                            <button
                                onClick={() => setStatus('waiting')}
                                className="mt-4 px-6 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-stone-800/50 border-t border-stone-700 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-stone-700 hover:bg-stone-600 rounded-lg font-medium"
                    >
                        Remove Item
                    </button>
                    <button
                        onClick={onSkip}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                        <UserX className="h-5 w-5" />
                        Skip (Regular Customer)
                    </button>
                </div>
            </div>
        </div>
    )
}
