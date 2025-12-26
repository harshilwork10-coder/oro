'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Upload, Image, Building2, FileText, Palette, Loader2, Check } from 'lucide-react'
import Link from 'next/link'

interface BrandingSettings {
    storeLogo: string | null
    storeDisplayName: string
    storeAddress: string
    storeAddress2: string
    storeCity: string
    storeState: string
    storeZip: string
    storePhone: string
    receiptHeader: string
    receiptFooter: string
    primaryColor: string
    franchiseName: string
}

export default function StoreBrandingPage() {
    const [settings, setSettings] = useState<BrandingSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/branding')
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            } else {
                setError('Failed to load settings')
            }
        } catch (e) {
            setError('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        setError('')
        setSaved(false)

        try {
            const res = await fetch('/api/settings/branding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save')
            }
        } catch (e) {
            setError('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // For now, convert to base64 data URL (production would use cloud storage)
        const reader = new FileReader()
        reader.onload = () => {
            if (settings && typeof reader.result === 'string') {
                setSettings({ ...settings, storeLogo: reader.result })
            }
        }
        reader.readAsDataURL(file)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-stone-950 p-8">
                <div className="text-center text-red-400">{error || 'Failed to load settings'}</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            {/* Header */}
            <div className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Store Branding</h1>
                            <p className="text-sm text-stone-400">Customize your logo, colors & receipt</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 rounded-lg font-medium transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-8">
                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Logo Section */}
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Image className="h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-bold">Store Logo</h2>
                    </div>
                    <p className="text-sm text-stone-400 mb-4">
                        Your logo appears on customer display, receipts, and reports.
                    </p>

                    <div className="flex items-start gap-6">
                        {/* Logo Preview */}
                        <div className="w-32 h-32 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center overflow-hidden">
                            {settings.storeLogo ? (
                                <img
                                    src={settings.storeLogo}
                                    alt="Store Logo"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Building2 className="h-12 w-12 text-stone-600" />
                            )}
                        </div>

                        <div className="flex-1 space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-sm transition-colors"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Logo
                            </button>
                            {settings.storeLogo && (
                                <button
                                    onClick={() => setSettings({ ...settings, storeLogo: null })}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove Logo
                                </button>
                            )}
                            <p className="text-xs text-stone-500">
                                Recommended: 200x200px PNG with transparent background
                            </p>
                        </div>
                    </div>
                </div>

                {/* Store Name & Color */}
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Palette className="h-5 w-5 text-purple-400" />
                        <h2 className="text-lg font-bold">Display Name & Theme</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-2">Store Display Name</label>
                            <input
                                type="text"
                                value={settings.storeDisplayName}
                                onChange={(e) => setSettings({ ...settings, storeDisplayName: e.target.value })}
                                placeholder={settings.franchiseName || 'My Store'}
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                            <p className="text-xs text-stone-500 mt-1">Shown on customer display & receipts</p>
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-2">Brand Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={settings.primaryColor}
                                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                    className="w-12 h-12 rounded-lg border border-stone-700 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={settings.primaryColor}
                                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                    placeholder="#F97316"
                                    className="flex-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Store Address */}
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Building2 className="h-5 w-5 text-blue-400" />
                        <h2 className="text-lg font-bold">Store Address</h2>
                    </div>
                    <p className="text-sm text-stone-400 mb-4">
                        Shown on receipts. Leave blank to not print address.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-stone-400 mb-2">Address Line 1</label>
                            <input
                                type="text"
                                value={settings.storeAddress}
                                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                                placeholder="123 Main Street"
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-stone-400 mb-2">Address Line 2 (Optional)</label>
                            <input
                                type="text"
                                value={settings.storeAddress2}
                                onChange={(e) => setSettings({ ...settings, storeAddress2: e.target.value })}
                                placeholder="Suite 100"
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-2">City</label>
                            <input
                                type="text"
                                value={settings.storeCity}
                                onChange={(e) => setSettings({ ...settings, storeCity: e.target.value })}
                                placeholder="Houston"
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-2">State</label>
                                <input
                                    type="text"
                                    value={settings.storeState}
                                    onChange={(e) => setSettings({ ...settings, storeState: e.target.value })}
                                    placeholder="TX"
                                    maxLength={2}
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-2">ZIP</label>
                                <input
                                    type="text"
                                    value={settings.storeZip}
                                    onChange={(e) => setSettings({ ...settings, storeZip: e.target.value })}
                                    placeholder="77001"
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-stone-400 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={settings.storePhone}
                                onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                                placeholder="(713) 555-1234"
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Receipt Customization */}
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="h-5 w-5 text-green-400" />
                        <h2 className="text-lg font-bold">Receipt Text</h2>
                    </div>
                    <p className="text-sm text-stone-400 mb-4">
                        Customize the header and footer text printed on receipts. You decide what to write!
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-2">
                                Receipt Header (Top of receipt)
                            </label>
                            <textarea
                                value={settings.receiptHeader}
                                onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                                placeholder="Welcome to Our Store!&#10;Open 7am - 10pm Daily"
                                rows={3}
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                            />
                            <p className="text-xs text-stone-500 mt-1">Each line prints on a new line</p>
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-2">
                                Receipt Footer (Bottom of receipt)
                            </label>
                            <textarea
                                value={settings.receiptFooter}
                                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                                placeholder="Thank you for your business!&#10;Visit us again soon!"
                                rows={3}
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Receipt Preview */}
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                    <h2 className="text-lg font-bold mb-4">📋 Receipt Preview</h2>
                    <div className="bg-white text-black p-6 rounded-lg max-w-sm mx-auto font-mono text-sm leading-relaxed">
                        {/* Logo */}
                        {settings.storeLogo && (
                            <div className="flex justify-center mb-3">
                                <img src={settings.storeLogo} alt="" className="h-12 object-contain" />
                            </div>
                        )}

                        {/* Store Name */}
                        <div className="text-center font-bold text-lg mb-1">
                            {settings.storeDisplayName || settings.franchiseName || 'Store Name'}
                        </div>

                        {/* Address */}
                        {settings.storeAddress && (
                            <div className="text-center text-xs text-gray-600 mb-2">
                                {settings.storeAddress}
                                {settings.storeAddress2 && <br />}
                                {settings.storeAddress2}
                                <br />
                                {settings.storeCity && `${settings.storeCity}, `}
                                {settings.storeState} {settings.storeZip}
                                {settings.storePhone && <><br />{settings.storePhone}</>}
                            </div>
                        )}

                        {/* Header */}
                        {settings.receiptHeader && (
                            <div className="text-center text-xs border-t border-dashed border-gray-300 pt-2 mt-2 whitespace-pre-line">
                                {settings.receiptHeader}
                            </div>
                        )}

                        {/* Items placeholder */}
                        <div className="border-t border-dashed border-gray-300 my-3 pt-3">
                            <div className="flex justify-between">
                                <span>1x Sample Item</span>
                                <span>$9.99</span>
                            </div>
                            <div className="flex justify-between">
                                <span>2x Another Item</span>
                                <span>$5.98</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-300 pt-2">
                            <div className="flex justify-between font-bold">
                                <span>TOTAL</span>
                                <span>$15.97</span>
                            </div>
                        </div>

                        {/* Footer */}
                        {settings.receiptFooter && (
                            <div className="text-center text-xs border-t border-dashed border-gray-300 pt-3 mt-3 whitespace-pre-line">
                                {settings.receiptFooter}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
