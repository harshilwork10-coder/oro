/**
 * DisplaySetupDialog — UI for display detection + confirmation
 *
 * Shows detected display candidates with confidence scores.
 * User picks one, runs test pattern, then saves the choice.
 */

'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Wifi, Usb, CheckCircle2, RefreshCw, X, Zap } from 'lucide-react'
import type { DisplayCandidate, DisplayManagerStatus } from '@/lib/display/types'

interface DisplaySetupDialogProps {
    isOpen: boolean
    onClose: () => void
    candidates: DisplayCandidate[]
    status: DisplayManagerStatus
    onSelect: (candidate: DisplayCandidate) => Promise<void>
    onTest: () => Promise<boolean>
    onRefresh: () => Promise<void>
    onDisconnect: () => void
}

const MODE_ICONS: Record<string, typeof Monitor> = {
    SECOND_SCREEN: Monitor,
    POLE_DISPLAY: Usb,
    REMOTE_BROWSER: Wifi,
    ANDROID_DISPLAY: Smartphone,
    VENDOR_INTEGRATED: Zap,
}

const MODE_LABELS: Record<string, string> = {
    SECOND_SCREEN: 'Secondary Screen',
    POLE_DISPLAY: 'Pole Display',
    REMOTE_BROWSER: 'Remote Display',
    ANDROID_DISPLAY: 'Android Display',
    VENDOR_INTEGRATED: 'Vendor Integrated',
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const pct = Math.round(confidence * 100)
    const color = pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
        : pct >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-stone-400 bg-stone-500/10 border-stone-500/30'
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
            {pct}%
        </span>
    )
}

export function DisplaySetupDialog({
    isOpen,
    onClose,
    candidates,
    status,
    onSelect,
    onTest,
    onRefresh,
    onDisconnect,
}: DisplaySetupDialogProps) {
    const [selecting, setSelecting] = useState<string | null>(null)
    const [testing, setTesting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        if (isOpen && candidates.length === 0) {
            onRefresh()
        }
    }, [isOpen, candidates.length, onRefresh])

    if (!isOpen) return null

    const handleSelect = async (candidate: DisplayCandidate) => {
        setSelecting(candidate.id)
        try {
            await onSelect(candidate)
        } catch (err) {
            console.error('Failed to connect:', err)
        }
        setSelecting(null)
    }

    const handleTest = async () => {
        setTesting(true)
        await onTest()
        setTesting(false)
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await onRefresh()
        setRefreshing(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
                    <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Customer Display Setup</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Connection Status */}
                {status.connected && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-emerald-300">Connected: {status.driverName}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTest}
                                disabled={testing}
                                className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                            >
                                {testing ? 'Testing...' : 'Test Pattern'}
                            </button>
                            <button
                                onClick={onDisconnect}
                                className="text-xs px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                )}

                {/* Candidate List */}
                <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-400">
                            {candidates.length} display{candidates.length !== 1 ? 's' : ''} detected
                        </span>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Rescan
                        </button>
                    </div>

                    {candidates.map(candidate => {
                        const Icon = MODE_ICONS[candidate.mode] || Monitor
                        const isActive = status.connected && status.mode === candidate.mode
                        const isSelecting = selecting === candidate.id

                        return (
                            <button
                                key={candidate.id}
                                onClick={() => handleSelect(candidate)}
                                disabled={isSelecting || isActive}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                    isActive
                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                        : 'bg-stone-800/50 border-stone-700 hover:border-amber-500/50 hover:bg-stone-800'
                                } disabled:opacity-60`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isActive ? 'bg-emerald-500/20' : 'bg-stone-700'
                                    }`}>
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-stone-300'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white truncate">
                                                {candidate.label}
                                            </span>
                                            <ConfidenceBadge confidence={candidate.confidence} />
                                        </div>
                                        <span className="text-xs text-stone-500">
                                            {MODE_LABELS[candidate.mode] || candidate.mode} · {candidate.source}
                                        </span>
                                    </div>
                                    {isActive && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                                    {isSelecting && (
                                        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-stone-700 bg-stone-900/50">
                    <p className="text-xs text-stone-500 text-center">
                        Select a display, then use &quot;Test Pattern&quot; to confirm it&apos;s the right one.
                    </p>
                </div>
            </div>
        </div>
    )
}
