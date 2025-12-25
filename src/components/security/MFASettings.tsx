'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldCheck, ShieldOff, Key, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react'

interface MFAStatus {
    mfaEnabled: boolean
    mfaSetupAt: string | null
    backupCodesRemaining: number
    isRequired: boolean
    isRecommended: boolean
    lowBackupCodes: boolean
}

interface MFASetupData {
    qrCode: string
    backupCodes: string[]
}

export default function MFASettings() {
    const [status, setStatus] = useState<MFAStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [setupData, setSetupData] = useState<MFASetupData | null>(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [disableCode, setDisableCode] = useState('')
    const [showDisable, setShowDisable] = useState(false)
    const [showBackupCodes, setShowBackupCodes] = useState(false)
    const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/mfa/status')
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
                setError('')
            } else {
                const data = await res.json()
                if (res.status === 404 || data.error === 'User not found') {
                    setError('User not found. Please log out and log back in to refresh your session.')
                } else if (res.status === 401) {
                    setError('Session expired. Please log out and log back in.')
                } else {
                    setError(data.error || 'Failed to load MFA status')
                }
            }
        } catch (err) {
            console.error('Failed to fetch MFA status:', err)
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const startSetup = async () => {
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/mfa/setup')
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to start MFA setup')
            }

            setSetupData({
                qrCode: data.qrCode,
                backupCodes: data.backupCodes
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const verifyAndEnable = async () => {
        if (verifyCode.length !== 6) {
            setError('Enter the 6-digit code from your authenticator app')
            return
        }

        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/mfa/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verifyCode })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed')
            }

            setSuccess('MFA enabled successfully!')
            setSetupData(null)
            setVerifyCode('')
            fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const disableMFA = async () => {
        if (disableCode.length !== 6) {
            setError('Enter your current MFA code to disable')
            return
        }

        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/mfa/setup', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: disableCode })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to disable MFA')
            }

            setSuccess('MFA has been disabled')
            setShowDisable(false)
            setDisableCode('')
            fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const regenerateBackupCodes = async () => {
        const code = prompt('Enter your current MFA code to regenerate backup codes:')
        if (!code) return

        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/mfa/backup-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to regenerate backup codes')
            }

            setNewBackupCodes(data.backupCodes)
            setShowBackupCodes(true)
            fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const copyBackupCodes = (codes: string[]) => {
        navigator.clipboard.writeText(codes.join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading && !status) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full" />
                    <div className="h-4 bg-gray-700 rounded w-48" />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status?.mfaEnabled ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                        {status?.mfaEnabled ? (
                            <ShieldCheck className="w-5 h-5 text-green-400" />
                        ) : (
                            <Shield className="w-5 h-5 text-yellow-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-400">
                            {status?.mfaEnabled ? 'Enabled' : 'Not enabled'}
                            {status?.isRequired && !status?.mfaEnabled && (
                                <span className="text-red-400 ml-2">• Required for your role</span>
                            )}
                            {status?.isRecommended && !status?.mfaEnabled && (
                                <span className="text-yellow-400 ml-2">• Recommended</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    {success}
                </div>
            )}

            {/* Low backup codes warning */}
            {status?.mfaEnabled && status?.lowBackupCodes && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 text-sm">
                        Low backup codes remaining ({status.backupCodesRemaining}). Consider generating new ones.
                    </span>
                </div>
            )}

            {/* Not enabled - show setup */}
            {!status?.mfaEnabled && !setupData && (
                <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        Add an extra layer of security to your account by requiring a code from your
                        authenticator app when signing in.
                    </p>
                    <button
                        onClick={startSetup}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Set Up Two-Factor Authentication'}
                    </button>
                </div>
            )}

            {/* Setup in progress */}
            {setupData && (
                <div className="space-y-6">
                    {/* Step 1: QR Code */}
                    <div>
                        <h4 className="font-medium text-white mb-2">Step 1: Scan QR Code</h4>
                        <p className="text-sm text-gray-400 mb-3">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div className="bg-white p-4 rounded-lg w-fit">
                            <img src={setupData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                        </div>
                    </div>

                    {/* Step 2: Backup Codes */}
                    <div>
                        <h4 className="font-medium text-white mb-2">Step 2: Save Backup Codes</h4>
                        <p className="text-sm text-gray-400 mb-3">
                            Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
                        </p>
                        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {setupData.backupCodes.map((code, i) => (
                                    <span key={i} className="text-gray-300">{code}</span>
                                ))}
                            </div>
                            <button
                                onClick={() => copyBackupCodes(setupData.backupCodes)}
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy all codes'}
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Verify */}
                    <div>
                        <h4 className="font-medium text-white mb-2">Step 3: Verify Setup</h4>
                        <p className="text-sm text-gray-400 mb-3">
                            Enter the 6-digit code from your authenticator app to complete setup.
                        </p>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-center tracking-widest w-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={verifyAndEnable}
                                disabled={loading || verifyCode.length !== 6}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Verify & Enable
                            </button>
                            <button
                                onClick={() => {
                                    setSetupData(null)
                                    setVerifyCode('')
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MFA Enabled - show management options */}
            {status?.mfaEnabled && !setupData && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-white text-sm font-medium">Backup Codes</p>
                                <p className="text-gray-400 text-xs">
                                    {status.backupCodesRemaining} codes remaining
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={regenerateBackupCodes}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                        </button>
                    </div>

                    {!status.isRequired && (
                        <>
                            {!showDisable ? (
                                <button
                                    onClick={() => setShowDisable(true)}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm"
                                >
                                    <ShieldOff className="w-4 h-4" />
                                    Disable Two-Factor Authentication
                                </button>
                            ) : (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 text-sm mb-3">
                                        Enter your current MFA code to disable:
                                    </p>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={disableCode}
                                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-center tracking-widest w-32"
                                        />
                                        <button
                                            onClick={disableMFA}
                                            disabled={loading || disableCode.length !== 6}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            Confirm Disable
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDisable(false)
                                                setDisableCode('')
                                            }}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* New backup codes modal */}
            {showBackupCodes && newBackupCodes && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">New Backup Codes</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Save these new backup codes. Your old codes are no longer valid.
                        </p>
                        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm mb-4">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {newBackupCodes.map((code, i) => (
                                    <span key={i} className="text-gray-300">{code}</span>
                                ))}
                            </div>
                            <button
                                onClick={() => copyBackupCodes(newBackupCodes)}
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy all codes'}
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setShowBackupCodes(false)
                                setNewBackupCodes(null)
                            }}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                            I&apos;ve Saved My Codes
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
