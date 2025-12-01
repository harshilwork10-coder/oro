'use client'

import { useState } from 'react'
import { X, Loader2, ArrowRightLeft, AlertTriangle } from 'lucide-react'

interface TransferTerminalModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    terminal: any
}

export default function TransferTerminalModal({ isOpen, onClose, onSuccess, terminal }: TransferTerminalModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [newLicenseKey, setNewLicenseKey] = useState('')
    const [reason, setReason] = useState('')
    const [confirmUnassign, setConfirmUnassign] = useState(false)

    if (!isOpen || !terminal) return null

    const handleTransfer = async () => {
        if (!newLicenseKey && !confirmUnassign) return

        setIsLoading(true)
        try {
            // First find the license ID from the key if we are transferring
            let newLicenseId = null
            if (newLicenseKey) {
                const licRes = await fetch(`/api/license/validate?licenseKey=${newLicenseKey}`) // We might need a better way to lookup ID from Key for admin
                // Actually, let's just use the admin license list endpoint to find it, or assume the user inputs the ID? 
                // User inputs Key usually.
                // Let's assume for now we need to lookup the license first.
                // Or better, the transfer endpoint should accept licenseKey.
                // But my API accepts newLicenseId.

                // Let's quickly fetch all licenses to find the ID (not efficient but works for now)
                const allLicRes = await fetch('/api/admin/licenses')
                const allLicData = await allLicRes.json()
                const targetLicense = allLicData.licenses.find((l: any) => l.licenseKey === newLicenseKey)

                if (!targetLicense) {
                    alert('License key not found')
                    setIsLoading(false)
                    return
                }
                newLicenseId = targetLicense.id
            }

            const res = await fetch('/api/admin/terminals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    terminalId: terminal.id,
                    newLicenseId: newLicenseId, // null means unassign
                    reason: reason
                })
            })

            const data = await res.json()

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                alert(data.error || 'Failed to transfer terminal')
            }
        } catch (error) {
            console.error('Transfer error:', error)
            alert('Failed to transfer terminal')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                        Transfer Terminal
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                        <p className="text-xs text-stone-500 uppercase mb-1">Selected Terminal</p>
                        <p className="text-white font-medium">{terminal.model}</p>
                        <p className="text-sm text-stone-400 font-mono">{terminal.serialNumber}</p>
                        <p className="text-xs text-stone-500 mt-2">
                            Current License: <span className="text-emerald-400">{terminal.license?.licenseKey || 'Unassigned'}</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-1">Target License Key</label>
                            <input
                                type="text"
                                value={newLicenseKey}
                                onChange={e => {
                                    setNewLicenseKey(e.target.value)
                                    setConfirmUnassign(false)
                                }}
                                placeholder="Enter license key (e.g. AURA-XXXX...)"
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-xs text-stone-500 mt-1">Leave empty to unassign from current license.</p>
                        </div>

                        {!newLicenseKey && (
                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-sm text-amber-200 font-medium">Unassign Terminal?</p>
                                    <p className="text-xs text-amber-400/80 mt-1">
                                        This will remove the terminal from its current location. It will need to be re-registered to be used again.
                                    </p>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={confirmUnassign}
                                            onChange={e => setConfirmUnassign(e.target.checked)}
                                            className="rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-xs text-stone-300">I understand, unassign this terminal</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-1">Reason for Transfer</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                                placeholder="e.g. Replacement, Location closed, etc."
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleTransfer}
                        disabled={isLoading || (!newLicenseKey && !confirmUnassign)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            newLicenseKey ? 'Transfer Terminal' : 'Unassign Terminal'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
