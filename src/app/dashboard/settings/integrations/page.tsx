'use client'

import { useState } from 'react'
import {
    Globe,
    Facebook,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Calendar,
    Settings,
    RefreshCw,
    Copy,
    AlertCircle,
    Zap
} from 'lucide-react'
import RoleGuard from '@/components/auth/RoleGuard'
import { Role } from '@/lib/permissions'

// Only PROVIDER can manage integrations (monetization feature)
const ALLOWED_ROLES = [Role.PROVIDER]

type IntegrationStatus = 'connected' | 'disconnected' | 'pending'

interface Integration {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    status: IntegrationStatus
    lastSync?: string
    bookingsToday?: number
}

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'google',
            name: 'Reserve with Google',
            description: 'Let customers book directly from Google Search and Maps',
            icon: <Globe className="w-6 h-6" />,
            status: 'disconnected'
        },
        {
            id: 'facebook',
            name: 'Facebook Booking',
            description: 'Accept bookings from your Facebook Business Page',
            icon: <Facebook className="w-6 h-6" />,
            status: 'disconnected'
        }
    ])

    const [webhookUrl, setWebhookUrl] = useState('')
    const [showWebhookModal, setShowWebhookModal] = useState(false)
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    // Generate webhook URL for this integration
    const generateWebhookUrl = (integrationId: string) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        return `${baseUrl}/api/integrations/${integrationId}-booking`
    }

    const handleConnect = (integrationId: string) => {
        const url = generateWebhookUrl(integrationId)
        setWebhookUrl(url)
        setSelectedIntegration(integrationId)
        setShowWebhookModal(true)
    }

    const copyWebhookUrl = async () => {
        await navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const confirmConnection = () => {
        if (selectedIntegration) {
            setIntegrations(prev => prev.map(int =>
                int.id === selectedIntegration
                    ? { ...int, status: 'connected' as IntegrationStatus, lastSync: 'Just now', bookingsToday: 0 }
                    : int
            ))
        }
        setShowWebhookModal(false)
    }

    const handleDisconnect = (integrationId: string) => {
        setIntegrations(prev => prev.map(int =>
            int.id === integrationId
                ? { ...int, status: 'disconnected' as IntegrationStatus, lastSync: undefined, bookingsToday: undefined }
                : int
        ))
    }

    return (
        <RoleGuard allowedRoles={ALLOWED_ROLES}>
            <div className="p-8 max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
                    <p className="text-stone-400">Connect your booking system with Google, Facebook, and more</p>
                </div>

                {/* Integrations List */}
                <div className="space-y-4">
                    {integrations.map((integration) => (
                        <div
                            key={integration.id}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${integration.id === 'google' ? 'bg-blue-500/20 text-blue-400' :
                                        integration.id === 'facebook' ? 'bg-blue-600/20 text-blue-500' :
                                            'bg-stone-700 text-stone-400'
                                        }`}>
                                        {integration.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {integration.name}
                                            {integration.status === 'connected' && (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            )}
                                        </h3>
                                        <p className="text-stone-400 text-sm mt-1">{integration.description}</p>

                                        {integration.status === 'connected' && (
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="w-4 h-4 text-stone-500" />
                                                    <span className="text-stone-400">
                                                        {integration.bookingsToday || 0} bookings today
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <RefreshCw className="w-4 h-4 text-stone-500" />
                                                    <span className="text-stone-400">
                                                        Last sync: {integration.lastSync}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {integration.status === 'connected' ? (
                                        <>
                                            <button className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 transition-colors">
                                                <Settings className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDisconnect(integration.id)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Disconnect
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(integration.id)}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* How It Works */}
                <div className="mt-8 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        How Social Booking Works
                    </h3>
                    <div className="space-y-3 text-sm text-stone-300">
                        <p><strong className="text-white">Reserve with Google:</strong> Customers find your business on Google Search or Maps and book directly. Bookings sync automatically to your Oronex calendar.</p>
                        <p><strong className="text-white">Facebook Booking:</strong> Add a "Book Now" button to your Facebook page. Customers book without leaving Facebook, and appointments appear in Oronex instantly.</p>
                    </div>
                </div>

                {/* Recent Bookings from Integrations */}
                <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-bold text-white">Recent Integration Bookings</h2>
                    </div>
                    <div className="p-12 text-center text-stone-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No bookings from integrations yet</p>
                        <p className="text-sm mt-1">Connect an integration to start receiving bookings</p>
                    </div>
                </div>

                {/* Webhook Setup Modal */}
                {showWebhookModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Connect {selectedIntegration === 'google' ? 'Reserve with Google' : 'Facebook Booking'}
                            </h2>
                            <p className="text-stone-400 mb-6">
                                Copy this webhook URL and paste it in your {selectedIntegration === 'google' ? 'Google Business Profile' : 'Facebook Business'} settings.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Webhook URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={webhookUrl}
                                            readOnly
                                            className="flex-1 px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm font-mono"
                                        />
                                        <button
                                            onClick={copyWebhookUrl}
                                            className="px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
                                        >
                                            {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-stone-800 rounded-lg p-4">
                                    <h4 className="font-medium text-white mb-2 text-sm">Setup Instructions:</h4>
                                    <ol className="text-sm text-stone-400 space-y-2 list-decimal list-inside">
                                        {selectedIntegration === 'google' ? (
                                            <>
                                                <li>Go to your Google Business Profile</li>
                                                <li>Navigate to Bookings settings</li>
                                                <li>Add Oronex as a booking partner</li>
                                                <li>Paste the webhook URL above</li>
                                                <li>Click Save and verify the connection</li>
                                            </>
                                        ) : (
                                            <>
                                                <li>Go to your Facebook Business Page</li>
                                                <li>Click Add a Button → Book Now</li>
                                                <li>Select "Link to Website"</li>
                                                <li>Paste the webhook URL above</li>
                                                <li>Save and publish</li>
                                            </>
                                        )}
                                    </ol>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                    <p className="text-sm text-amber-300">
                                        Make sure your server is publicly accessible for webhooks to work.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowWebhookModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmConnection}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        Mark as Connected
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    )
}

