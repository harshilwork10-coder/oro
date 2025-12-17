'use client'

import { useState } from 'react'
import { X, Search, Wifi, CheckCircle, RefreshCw, Monitor } from 'lucide-react'

interface TerminalSetupModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: (ip: string) => void
}

// Common local network ranges to scan
const COMMON_NETWORKS = [
    '192.168.1',
    '192.168.0',
    '10.0.0',
    '10.0.1',
    '172.16.0',
]

export default function TerminalSetupModal({ isOpen, onClose, onSuccess }: TerminalSetupModalProps) {
    const [scanning, setScanning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [foundTerminals, setFoundTerminals] = useState<string[]>([])
    const [selectedIp, setSelectedIp] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [scanStatus, setScanStatus] = useState('')

    if (!isOpen) return null

    // Scan a single IP to check if PAX terminal is there
    const checkIp = async (ip: string): Promise<boolean> => {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 1500)

            // Try to reach PAX terminal
            const response = await fetch(`http://${ip}:10009/PaxResponse`, {
                method: 'GET',
                signal: controller.signal,
                mode: 'no-cors' // We can't read the response, but we can check if it connects
            }).catch(() => null)

            clearTimeout(timeoutId)

            // If we didn't get an abort error, something responded
            return response !== null
        } catch {
            return false
        }
    }

    // Scan common network ranges for terminals
    const scanNetwork = async () => {
        setScanning(true)
        setFoundTerminals([])
        setProgress(0)
        setScanStatus('Starting scan...')

        const found: string[] = []
        const totalIps = COMMON_NETWORKS.length * 254
        let scanned = 0

        for (const baseIp of COMMON_NETWORKS) {
            setScanStatus(`Scanning ${baseIp}.x ...`)

            // Scan in batches of 10 for speed
            for (let i = 1; i <= 254; i += 10) {
                const promises = []
                for (let j = i; j < Math.min(i + 10, 255); j++) {
                    const ip = `${baseIp}.${j}`
                    promises.push(
                        checkIp(ip).then(isTerminal => {
                            if (isTerminal) {
                                found.push(ip)
                                setFoundTerminals([...found])
                            }
                        })
                    )
                }
                await Promise.all(promises)
                scanned += 10
                setProgress(Math.min(100, Math.round((scanned / totalIps) * 100)))
            }
        }

        setScanStatus(found.length > 0 ? `Found ${found.length} terminal(s)!` : 'No terminals found')
        setScanning(false)
        setProgress(100)

        // If only one found, auto-select it
        if (found.length === 1) {
            setSelectedIp(found[0])
        }
    }

    // Quick scan - just scan first few common IPs
    const quickScan = async () => {
        setScanning(true)
        setFoundTerminals([])
        setScanStatus('Quick scanning common IPs...')

        const quickIps = [
            '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.150',
            '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.150',
            '10.0.0.100', '10.0.0.101', '10.0.0.102', '10.0.0.150',
            '10.0.1.100', '10.0.1.101', '10.0.1.102', '10.0.1.150',
        ]

        const found: string[] = []

        for (let i = 0; i < quickIps.length; i++) {
            setProgress(Math.round((i / quickIps.length) * 100))
            const isTerminal = await checkIp(quickIps[i])
            if (isTerminal) {
                found.push(quickIps[i])
                setFoundTerminals([...found])
            }
        }

        setScanStatus(found.length > 0 ? `Found ${found.length} terminal(s)!` : 'No terminals found in common IPs')
        setScanning(false)
        setProgress(100)

        if (found.length === 1) {
            setSelectedIp(found[0])
        }
    }

    const saveTerminal = async () => {
        if (!selectedIp) return

        setSaving(true)
        try {
            const res = await fetch('/api/terminals/discover-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discoveredIP: selectedIp,
                    discoveredPort: '10009'
                })
            })

            if (res.ok) {
                setSaved(true)
                setTimeout(() => {
                    onSuccess?.(selectedIp)
                    onClose()
                }, 1500)
            }
        } catch (e) {
            console.error('Failed to save terminal:', e)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-lg w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="h-6 w-6 text-blue-400" />
                        <h3 className="text-xl font-bold text-white">Find Card Terminal</h3>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-stone-400 text-sm mb-6">
                    Click "Find Terminal" to scan your network for PAX card terminals. This will automatically find and configure your terminal.
                </p>

                {/* Scan Buttons */}
                {!saved && (
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={quickScan}
                            disabled={scanning}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                        >
                            {scanning ? (
                                <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                            {scanning ? 'Scanning...' : 'Find Terminal'}
                        </button>
                        <button
                            onClick={scanNetwork}
                            disabled={scanning}
                            className="px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Full Scan
                        </button>
                    </div>
                )}

                {/* Progress */}
                {scanning && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-stone-400">{scanStatus}</span>
                            <span className="text-white">{progress}%</span>
                        </div>
                        <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Found Terminals */}
                {foundTerminals.length > 0 && (
                    <div className="mb-6">
                        <p className="text-sm font-medium text-stone-300 mb-2">Found Terminals:</p>
                        <div className="space-y-2">
                            {foundTerminals.map((ip) => (
                                <button
                                    key={ip}
                                    onClick={() => setSelectedIp(ip)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${selectedIp === ip
                                            ? 'bg-blue-500/20 border-blue-500'
                                            : 'bg-stone-800 border-stone-700 hover:border-stone-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Wifi className={`h-5 w-5 ${selectedIp === ip ? 'text-blue-400' : 'text-stone-400'}`} />
                                        <span className="font-mono text-white">{ip}:10009</span>
                                    </div>
                                    {selectedIp === ip && (
                                        <CheckCircle className="h-5 w-5 text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                {selectedIp && !saved && (
                    <button
                        onClick={saveTerminal}
                        disabled={saving}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                        {saving ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                            <CheckCircle className="h-5 w-5" />
                        )}
                        {saving ? 'Saving...' : `Use Terminal at ${selectedIp}`}
                    </button>
                )}

                {/* Success */}
                {saved && (
                    <div className="text-center py-4">
                        <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                        <p className="text-xl font-bold text-white mb-2">Terminal Configured!</p>
                        <p className="text-stone-400">IP: {selectedIp}</p>
                    </div>
                )}

                {/* No terminals found message */}
                {!scanning && progress === 100 && foundTerminals.length === 0 && (
                    <div className="text-center py-4 text-stone-400">
                        <p>No terminals found. Make sure:</p>
                        <ul className="text-sm mt-2 text-left list-disc list-inside">
                            <li>Terminal is powered on</li>
                            <li>Terminal is connected to the same network as this device</li>
                            <li>Terminal shows "Ready" on screen</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}
