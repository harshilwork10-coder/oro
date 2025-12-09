'use client'

import { useState, useEffect } from 'react'
import { Mail, MessageSquare, Save, Bell, Clock, Check, AlertCircle } from 'lucide-react'

interface ReminderSettings {
    emailEnabled: boolean
    confirmationEmail: boolean
    reminder24hEmail: boolean
    reminder2hEmail: boolean
    smsEnabled: boolean
    confirmationSms: boolean
    reminder24hSms: boolean
    reminder2hSms: boolean
    twilioAccountSid: string | null
    twilioAuthToken: string | null
    twilioPhoneNumber: string | null
    emailSubject: string
    emailTemplate: string | null
    smsTemplate: string | null
}

export default function RemindersSettingsPage() {
    const [settings, setSettings] = useState<ReminderSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/reminders/settings')
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        if (!settings) return
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch('/api/reminders/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error('Failed to save settings:', error)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="text-orange-500 text-xl">Loading...</div>
            </div>
        )
    }

    if (!settings) return null

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Bell className="h-8 w-8 text-orange-500" />
                        Appointment Reminders
                    </h1>
                    <p className="text-stone-400 mt-2">Configure automated reminder notifications</p>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                    {saved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Reminders */}
                <div className="glass-panel rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Mail className="h-6 w-6 text-blue-400" />
                        <h2 className="text-xl font-semibold text-white">Email Reminders</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg cursor-pointer">
                            <div>
                                <p className="font-medium text-white">Enable Email Reminders</p>
                                <p className="text-sm text-stone-400">Send reminders via email</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.emailEnabled}
                                onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                                className="w-5 h-5 rounded accent-orange-500"
                            />
                        </label>

                        {settings.emailEnabled && (
                            <>
                                <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                    <div>
                                        <p className="text-white">Booking Confirmation</p>
                                        <p className="text-sm text-stone-400">Sent immediately after booking</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.confirmationEmail}
                                        onChange={(e) => setSettings({ ...settings, confirmationEmail: e.target.checked })}
                                        className="w-5 h-5 rounded accent-orange-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                    <div>
                                        <p className="text-white">24-Hour Reminder</p>
                                        <p className="text-sm text-stone-400">Sent 24 hours before appointment</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.reminder24hEmail}
                                        onChange={(e) => setSettings({ ...settings, reminder24hEmail: e.target.checked })}
                                        className="w-5 h-5 rounded accent-orange-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                    <div>
                                        <p className="text-white">2-Hour Reminder</p>
                                        <p className="text-sm text-stone-400">Sent 2 hours before appointment</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.reminder2hEmail}
                                        onChange={(e) => setSettings({ ...settings, reminder2hEmail: e.target.checked })}
                                        className="w-5 h-5 rounded accent-orange-500"
                                    />
                                </label>

                                <div className="pt-4 border-t border-stone-800">
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Email Subject</label>
                                    <input
                                        type="text"
                                        value={settings.emailSubject}
                                        onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="Appointment Reminder"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* SMS Reminders */}
                <div className="glass-panel rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="h-6 w-6 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">SMS Reminders</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg cursor-pointer">
                            <div>
                                <p className="font-medium text-white">Enable SMS Reminders</p>
                                <p className="text-sm text-stone-400">Send reminders via text message</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.smsEnabled}
                                onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                                className="w-5 h-5 rounded accent-orange-500"
                            />
                        </label>

                        {settings.smsEnabled && (
                            <>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                                        <div>
                                            <p className="text-amber-300 font-medium">Twilio Required</p>
                                            <p className="text-sm text-amber-300/70">SMS reminders require a Twilio account</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Twilio Account SID</label>
                                    <input
                                        type="text"
                                        value={settings.twilioAccountSid || ''}
                                        onChange={(e) => setSettings({ ...settings, twilioAccountSid: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white font-mono text-sm"
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Twilio Auth Token</label>
                                    <input
                                        type="password"
                                        value={settings.twilioAuthToken || ''}
                                        onChange={(e) => setSettings({ ...settings, twilioAuthToken: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white font-mono text-sm"
                                        placeholder="Your auth token"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Twilio Phone Number</label>
                                    <input
                                        type="text"
                                        value={settings.twilioPhoneNumber || ''}
                                        onChange={(e) => setSettings({ ...settings, twilioPhoneNumber: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="+1 555 123 4567"
                                    />
                                </div>

                                <div className="pt-4 border-t border-stone-800 space-y-3">
                                    <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                        <p className="text-white">Booking Confirmation</p>
                                        <input
                                            type="checkbox"
                                            checked={settings.confirmationSms}
                                            onChange={(e) => setSettings({ ...settings, confirmationSms: e.target.checked })}
                                            className="w-5 h-5 rounded accent-orange-500"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                        <p className="text-white">24-Hour Reminder</p>
                                        <input
                                            type="checkbox"
                                            checked={settings.reminder24hSms}
                                            onChange={(e) => setSettings({ ...settings, reminder24hSms: e.target.checked })}
                                            className="w-5 h-5 rounded accent-orange-500"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between p-4 bg-stone-900/30 rounded-lg cursor-pointer">
                                        <p className="text-white">2-Hour Reminder</p>
                                        <input
                                            type="checkbox"
                                            checked={settings.reminder2hSms}
                                            onChange={(e) => setSettings({ ...settings, reminder2hSms: e.target.checked })}
                                            className="w-5 h-5 rounded accent-orange-500"
                                        />
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-stone-900/30 border border-stone-800 rounded-xl">
                <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-stone-400 mt-0.5" />
                    <div>
                        <p className="text-stone-300">How Reminders Work</p>
                        <p className="text-sm text-stone-500 mt-1">
                            Reminders are sent automatically based on your configuration. Confirmation emails are sent immediately after a booking is made.
                            24-hour and 2-hour reminders are sent before the appointment time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
