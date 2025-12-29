'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft,
    Store,
    Globe,
    MapPin,
    Phone,
    Clock,
    Image,
    Save,
    Loader2,
    CheckCircle,
    Smartphone,
    Users,
    Share2,
    MessageCircle,
    Copy,
    Link as LinkIcon
} from 'lucide-react'

interface DirectorySettings {
    showInDirectory: boolean
    publicName: string
    publicDescription: string
    publicPhone: string
    businessType: string
    latitude: number | null
    longitude: number | null
    operatingHours: string
    publicLogoUrl: string
    publicBannerUrl: string
}

export default function OroDirectorySettingsPage() {
    const { data: session } = useSession()
    const [settings, setSettings] = useState<DirectorySettings>({
        showInDirectory: false,
        publicName: '',
        publicDescription: '',
        publicPhone: '',
        businessType: 'RETAIL',
        latitude: null,
        longitude: null,
        operatingHours: '',
        publicLogoUrl: '',
        publicBannerUrl: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Share modal state
    const [showShareModal, setShowShareModal] = useState<'sms' | 'whatsapp' | null>(null)
    const [customers, setCustomers] = useState<{ id: string; name: string; phone: string }[]>([])
    const [selectedPhone, setSelectedPhone] = useState('')
    const [selectedCustomerName, setSelectedCustomerName] = useState('')
    const [sending, setSending] = useState(false)

    // Fetch settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings/directory')
                if (res.ok) {
                    const data = await res.json()
                    setSettings(prev => ({ ...prev, ...data }))
                }
            } catch (e) {
                console.error('Error fetching settings:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchSettings()
    }, [])

    // Fetch customers from loyalty database
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await fetch('/api/clients?limit=50')
                if (res.ok) {
                    const data = await res.json()
                    // Filter customers that have phone numbers
                    const customersWithPhone = (data.clients || data || [])
                        .filter((c: any) => c.phone)
                        .map((c: any) => ({
                            id: c.id,
                            name: c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.name || 'Customer',
                            phone: c.phone
                        }))
                    setCustomers(customersWithPhone)
                }
            } catch (e) {
                console.error('Error fetching customers:', e)
            }
        }
        fetchCustomers()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/directory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (e) {
            console.error('Error saving:', e)
        } finally {
            setSaving(false)
        }
    }

    const detectLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setSettings(prev => ({
                        ...prev,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }))
                },
                () => alert('Could not get location')
            )
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/settings"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                                <Store className="w-6 h-6 text-white" />
                            </div>
                            Oro Buddy Directory
                        </h1>
                        <p className="text-gray-400 mt-1">Get discovered by new customers</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 rounded-lg text-white font-semibold transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* What is Oro Buddy */}
            <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/20 border border-orange-500/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-orange-400" />
                    What is Oro Buddy?
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-stone-900/50 rounded-lg p-4">
                        <p className="text-2xl mb-2">📱</p>
                        <p className="text-white font-medium">Customer App</p>
                        <p className="text-sm text-gray-400">Customers download the app to discover local stores</p>
                    </div>
                    <div className="bg-stone-900/50 rounded-lg p-4">
                        <p className="text-2xl mb-2">🏷️</p>
                        <p className="text-white font-medium">Your Deals Appear</p>
                        <p className="text-sm text-gray-400">Deals you create show up instantly in the app</p>
                    </div>
                    <div className="bg-stone-900/50 rounded-lg p-4">
                        <p className="text-2xl mb-2">👥</p>
                        <p className="text-white font-medium">New Customers Visit</p>
                        <p className="text-sm text-gray-400">Customers find you, get directions, and shop</p>
                    </div>
                </div>
            </div>

            {/* Opt-In Toggle */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <Globe className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Show in Oro Buddy Directory</h3>
                            <p className="text-sm text-gray-400">Allow customers to discover your store in the app</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSettings(prev => ({ ...prev, showInDirectory: !prev.showInDirectory }))}
                        className={`relative w-14 h-8 rounded-full transition-colors ${settings.showInDirectory ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                    >
                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.showInDirectory ? 'left-7' : 'left-1'
                            }`} />
                    </button>
                </div>
            </div>

            {/* Share My Store - Only show if opted in */}
            {settings.showInDirectory && (
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-400" />
                        Share My Store
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Text your store link to customers from your loyalty database!
                    </p>

                    {/* Share Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setShowShareModal('sms')}
                            className="flex flex-col items-center gap-2 p-4 bg-green-600/20 border border-green-500/30 rounded-xl hover:bg-green-600/30 transition-colors"
                        >
                            <MessageCircle className="w-8 h-8 text-green-400" />
                            <span className="text-sm text-green-300 font-medium">Text Message</span>
                        </button>

                        <button
                            onClick={() => setShowShareModal('whatsapp')}
                            className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 transition-colors"
                        >
                            <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span className="text-sm text-emerald-300 font-medium">WhatsApp</span>
                        </button>

                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/app`
                                navigator.clipboard.writeText(url)
                                alert('✅ Link copied! Paste it anywhere to share.')
                            }}
                            className="flex flex-col items-center gap-2 p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition-colors"
                        >
                            <Copy className="w-8 h-8 text-purple-400" />
                            <span className="text-sm text-purple-300 font-medium">Copy Link</span>
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4 text-center">
                        💡 Select from your loyalty customers or enter a new number
                    </p>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700 max-h-[80vh] overflow-auto">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            {showShareModal === 'sms' ? (
                                <>
                                    <MessageCircle className="w-6 h-6 text-green-400" />
                                    Send Text Message
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Send WhatsApp
                                </>
                            )}
                        </h3>

                        {/* Existing Customers from Loyalty */}
                        {customers.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Select from Loyalty Customers
                                </label>
                                <div className="space-y-2 max-h-40 overflow-auto">
                                    {customers.map(customer => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                setSelectedPhone(customer.phone)
                                                setSelectedCustomerName(customer.name)
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedPhone === customer.phone
                                                ? 'border-blue-500 bg-blue-500/20'
                                                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-white font-medium">{customer.name}</p>
                                                <p className="text-sm text-gray-400">{customer.phone}</p>
                                            </div>
                                            {selectedPhone === customer.phone && (
                                                <CheckCircle className="w-5 h-5 text-blue-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Or Enter New Number */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {customers.length > 0 ? 'Or Enter New Number' : 'Enter Phone Number'}
                            </label>
                            <input
                                type="tel"
                                value={selectedPhone}
                                onChange={(e) => {
                                    setSelectedPhone(e.target.value)
                                    setSelectedCustomerName('')
                                }}
                                placeholder="(555) 123-4567"
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Message Preview */}
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-400 mb-1">Message Preview:</p>
                            <p className="text-white text-sm">
                                {selectedCustomerName ? `Hi ${selectedCustomerName}! ` : ''}
                                Check out our store on Oro Buddy! Get exclusive deals 🏷️ {typeof window !== 'undefined' ? window.location.origin : ''}/app
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowShareModal(null)
                                    setSelectedPhone('')
                                    setSelectedCustomerName('')
                                }}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedPhone) {
                                        alert('Please enter or select a phone number')
                                        return
                                    }

                                    const phone = selectedPhone.replace(/\D/g, '')

                                    if (showShareModal === 'sms') {
                                        // Use existing Twilio SMS system via API
                                        setSending(true)
                                        try {
                                            const res = await fetch('/api/share/store', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    phone,
                                                    customerName: selectedCustomerName
                                                })
                                            })
                                            const data = await res.json()
                                            if (data.success) {
                                                alert('✅ SMS sent successfully!')
                                            } else {
                                                alert(`❌ ${data.error || 'Failed to send SMS'}`)
                                            }
                                        } catch (e) {
                                            alert('❌ Failed to send SMS')
                                        } finally {
                                            setSending(false)
                                        }
                                    } else {
                                        // WhatsApp - opens app (no API needed)
                                        const url = `${window.location.origin}/app`
                                        const message = selectedCustomerName
                                            ? `Hi ${selectedCustomerName}! Check out our store on Oro Buddy! Get exclusive deals 🏷️ ${url}`
                                            : `Check out our store on Oro Buddy! Get exclusive deals 🏷️ ${url}`
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                                    }

                                    setShowShareModal(null)
                                    setSelectedPhone('')
                                    setSelectedCustomerName('')
                                }}
                                disabled={!selectedPhone || sending}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-400 hover:to-emerald-500 disabled:opacity-50"
                            >
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Form */}
            {settings.showInDirectory && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                    {/* Business Info */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-white">Business Information</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={settings.publicName}
                                    onChange={(e) => setSettings(prev => ({ ...prev, publicName: e.target.value }))}
                                    placeholder="Your Store Name"
                                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Business Type
                                </label>
                                <select
                                    value={settings.businessType}
                                    onChange={(e) => setSettings(prev => ({ ...prev, businessType: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                >
                                    <option value="RETAIL">🛒 Retail Store</option>
                                    <option value="RESTAURANT">🍽️ Restaurant</option>
                                    <option value="SALON">💇 Salon / Spa</option>
                                    <option value="GROCERY">🥬 Grocery</option>
                                    <option value="CONVENIENCE">🏪 Convenience Store</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={settings.publicDescription}
                                onChange={(e) => setSettings(prev => ({ ...prev, publicDescription: e.target.value }))}
                                placeholder="Tell customers about your store..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Contact Phone
                            </label>
                            <input
                                type="tel"
                                value={settings.publicPhone}
                                onChange={(e) => setSettings(prev => ({ ...prev, publicPhone: e.target.value }))}
                                placeholder="(555) 123-4567"
                                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-orange-400" />
                                Location
                            </h3>
                            <button
                                onClick={detectLocation}
                                className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30"
                            >
                                📍 Detect My Location
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={settings.latitude || ''}
                                    onChange={(e) => setSettings(prev => ({ ...prev, latitude: parseFloat(e.target.value) || null }))}
                                    placeholder="e.g. 40.7128"
                                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={settings.longitude || ''}
                                    onChange={(e) => setSettings(prev => ({ ...prev, longitude: parseFloat(e.target.value) || null }))}
                                    placeholder="e.g. -74.0060"
                                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
