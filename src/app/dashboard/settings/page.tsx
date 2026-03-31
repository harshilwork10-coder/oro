'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    CreditCard, DollarSign, Users, Shield, Save, AlertCircle, FileText, Printer, Settings, Lock, Phone,
    Store, Clock, Tag, Palette, Eye, Monitor, Receipt, Megaphone, Calendar, ToggleRight,
    Landmark, Percent, GraduationCap, Sliders, Globe, MessageSquare, ChefHat, ArrowRight
} from 'lucide-react'
import { useState, useEffect } from 'react'

// Settings hub card grid
const settingsCategories = [
    {
        title: 'Store & Business',
        cards: [
            { name: 'Business Info', href: '/dashboard/settings/business', icon: Store, desc: 'Store name, address, contact' },
            { name: 'Store Hours', href: '/dashboard/settings/store-hours', icon: Clock, desc: 'Operating hours & holidays' },
            { name: 'ORO Directory', href: '/dashboard/settings/oro-directory', icon: Globe, desc: 'Public listing settings' },
        ]
    },
    {
        title: 'Taxes & Pricing',
        cards: [
            { name: 'Tax Setup', href: '/dashboard/settings/tax-setup', icon: Landmark, desc: 'Tax rates & categories' },
            { name: 'Pricing Rules', href: '/dashboard/settings/pricing-rules', icon: Percent, desc: 'Markups, rounding, rules' },
            { name: 'Bottle Deposit', href: '/dashboard/settings/bottle-deposit', icon: Tag, desc: 'Container deposit reqs' },
        ]
    },
    {
        title: 'Hardware',
        cards: [
            { name: 'Printers', href: '/dashboard/settings/printers', icon: Printer, desc: 'Receipt & label printers' },
            { name: 'Stations', href: '/dashboard/settings/stations', icon: Monitor, desc: 'POS station management' },
            { name: 'POS Layout', href: '/dashboard/settings/pos-layout', icon: Sliders, desc: 'Screen layout & buttons' },
        ]
    },
    {
        title: 'Appearance & Security',
        cards: [
            { name: 'Branding', href: '/dashboard/settings/branding', icon: Palette, desc: 'Logo, colors, theme' },
            { name: 'Appearance', href: '/dashboard/settings/appearance', icon: Eye, desc: 'Theme & display options' },
            { name: 'Security', href: '/dashboard/settings/security', icon: Shield, desc: 'Passwords, 2FA, access' },
        ]
    },
    {
        title: 'Features & Controls',
        cards: [
            { name: 'Feature Toggles', href: '/dashboard/settings/features', icon: ToggleRight, desc: 'Enable/disable features' },
            { name: 'Training Mode', href: '/dashboard/settings/training-mode', icon: GraduationCap, desc: 'Practice mode for staff' },
            { name: 'Operational Controls', href: '/dashboard/settings/operational-controls', icon: Sliders, desc: 'Drawer limits, return rules' },
        ]
    },
    {
        title: 'Communication',
        cards: [
            { name: 'SMS Marketing', href: '/dashboard/settings/sms-marketing', icon: MessageSquare, desc: 'Text campaigns' },
            { name: 'Scheduled Reports', href: '/dashboard/settings/scheduled-reports', icon: Calendar, desc: 'Auto email reports' },
            { name: 'Reminders', href: '/dashboard/settings/reminders', icon: Megaphone, desc: 'Customer notifications' },
        ]
    },
    {
        title: 'Payments',
        cards: [
            { name: 'Payment Processors', href: '/dashboard/settings/payment-processors', icon: CreditCard, desc: 'Gateway configuration' },
            { name: 'Receipt Template', href: '/dashboard/settings/receipt-template', icon: Receipt, desc: 'Customize receipts' },
        ]
    },
]

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const isProvider = session?.user?.role === 'PROVIDER'
    const canEdit = isProvider
    const industryType = (session?.user as any)?.industryType || 'SERVICE'

    // Pricing Settings
    const [pricingModel, setPricingModel] = useState('DUAL_PRICING')
    const [surchargeType, setSurchargeType] = useState('PERCENTAGE')
    const [surchargeValue, setSurchargeValue] = useState('3.99')
    const [taxRate, setTaxRate] = useState('8.25')

    // Tip Settings
    const [tipEnabled, setTipEnabled] = useState(true)
    const [tipType, setTipType] = useState('PERCENT')
    const [tipSuggestions, setTipSuggestions] = useState('15,20,25')

    // Payment Options
    const [acceptsEbt, setAcceptsEbt] = useState(false)
    const [acceptsChecks, setAcceptsChecks] = useState(false)
    const [acceptsOnAccount, setAcceptsOnAccount] = useState(false)

    // Receipt Print Settings
    const [receiptPrintMode, setReceiptPrintMode] = useState('ALL')
    const [openDrawerOnCash, setOpenDrawerOnCash] = useState(true)

    // Employee List
    const [employees, setEmployees] = useState<any[]>([])

    useEffect(() => {
        fetchSettings()
        fetchEmployees()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/franchise')
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setPricingModel(data.pricingModel || 'STANDARD')
                    setSurchargeType(data.cardSurchargeType || 'PERCENTAGE')
                    setSurchargeValue(data.cardSurcharge?.toString() || '3.99')
                    if (data.taxRate) {
                        setTaxRate((parseFloat(data.taxRate) * 100).toFixed(2))
                    }
                    setTipEnabled(data.tipPromptEnabled ?? true)
                    setTipType(data.tipType || 'PERCENT')
                    setTipSuggestions(data.tipSuggestions?.replace(/[\[\]]/g, '') || '15,20,25')
                    setAcceptsEbt(data.acceptsEbt ?? false)
                    setAcceptsChecks(data.acceptsChecks ?? false)
                    setAcceptsOnAccount(data.acceptsOnAccount ?? false)
                    setReceiptPrintMode(data.receiptPrintMode || 'ALL')
                    setOpenDrawerOnCash(data.openDrawerOnCash ?? true)
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/settings/employees')
            if (res.ok) {
                const data = await res.json()
                setEmployees(data)
            }
        } catch (error) {
            console.error('Error fetching employees:', error)
        }
    }

    const saveSettings = async () => {
        setSaving(true)
        setMessage('')
        try {
            const res = await fetch('/api/settings/franchise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pricingModel,
                    cardSurchargeType: surchargeType,
                    cardSurcharge: parseFloat(surchargeValue),
                    showDualPricing: pricingModel === 'DUAL_PRICING',
                    taxRate: parseFloat(taxRate) / 100,
                    tipPromptEnabled: tipEnabled,
                    tipType,
                    tipSuggestions: `[${tipSuggestions}]`,
                    acceptsEbt,
                    acceptsChecks,
                    acceptsOnAccount,
                    receiptPrintMode,
                    openDrawerOnCash
                })
            })
            if (res.ok) {
                setMessage('Settings saved successfully!')
            } else {
                setMessage('Failed to save settings')
            }
        } catch (error) {
            setMessage('Error saving settings')
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    const updateEmployeePermission = async (employeeId: string, permission: string, value: boolean) => {
        try {
            const res = await fetch('/api/settings/employees/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, permission, value })
            })
            if (res.ok) {
                setEmployees(prev => prev.map(emp =>
                    emp.id === employeeId ? { ...emp, [permission]: value } : emp
                ))
                setMessage('Permission updated!')
                setTimeout(() => setMessage(''), 2000)
            }
        } catch (error) {
            setMessage('Failed to update permission')
        }
    }

    const calculateCardPrice = (cashPrice: number) => {
        if (pricingModel === 'STANDARD') return cashPrice
        if (surchargeType === 'PERCENTAGE') {
            return cashPrice * (1 + parseFloat(surchargeValue) / 100)
        } else {
            return cashPrice + parseFloat(surchargeValue)
        }
    }

    if (loading) {
        return (<div className="p-8"><div className="animate-pulse">Loading settings...</div></div>)
    }

    // Filter categories by industry
    const filteredCategories = settingsCategories.filter(cat => {
        // Salon features only for SERVICE
        if (cat.title === 'Salon Features' && industryType !== 'SERVICE') return false
        return true
    })

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Settings
            </h1>
            <p className="text-stone-400 mb-8">Manage your store configuration, hardware, and preferences.</p>

            {/* Provider-Managed Notice */}
            {!canEdit && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Lock className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-200">Settings Managed by Your Provider</h3>
                            <p className="text-sm text-stone-400 mt-1">
                                Core settings are configured by our support team. Need changes? Contact support.
                            </p>
                            <a href="tel:+18005551234" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                                <Phone className="h-4 w-4" /> Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <div className={`mb-6 p-4 rounded-lg ${message.includes('saved') || message.includes('updated') ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-400' : 'bg-red-900/30 border border-red-500/30 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* ========== SETTINGS HUB GRID ========== */}
            <div className="space-y-8 mb-10">
                {filteredCategories.map((category) => (
                    <div key={category.title}>
                        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">{category.title}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {category.cards.map((card) => {
                                const CardIcon = card.icon
                                return (
                                    <Link
                                        key={card.href}
                                        href={card.href}
                                        className="glass-panel p-4 rounded-xl hover:border-orange-500/30 transition-all group flex items-start gap-3"
                                    >
                                        <div className="h-10 w-10 bg-stone-800/80 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/10 transition-colors">
                                            <CardIcon className="h-5 w-5 text-stone-400 group-hover:text-orange-400 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-stone-200 group-hover:text-orange-200 transition-colors">{card.name}</p>
                                            <p className="text-xs text-stone-500 mt-0.5">{card.desc}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-orange-400 mt-1 flex-shrink-0 transition-colors" />
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ========== INLINE QUICK SETTINGS (preserved from original) ========== */}
            <div className="border-t border-stone-800 pt-8">
                <h2 className="text-lg font-bold text-stone-200 mb-6">Quick Settings</h2>

                {/* Pricing Configuration */}
                <div className="glass-panel rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-100">Pricing Configuration</h2>
                            <p className="text-sm text-stone-400">Configure card surcharge for your franchise</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-stone-300 mb-3">Pricing Model</label>
                            <div className="flex gap-4">
                                <button onClick={() => setPricingModel('STANDARD')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${pricingModel === 'STANDARD' ? 'border-orange-500 bg-orange-500/10' : 'border-stone-700 hover:border-stone-600'}`}>
                                    <div className="font-bold text-stone-200">Standard Pricing</div>
                                    <div className="text-sm text-stone-400">Single price for all payment types</div>
                                </button>
                                <button onClick={() => setPricingModel('DUAL_PRICING')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${pricingModel === 'DUAL_PRICING' ? 'border-orange-500 bg-orange-500/10' : 'border-stone-700 hover:border-stone-600'}`}>
                                    <div className="font-bold text-stone-200">Dual Pricing</div>
                                    <div className="text-sm text-stone-400">Separate cash and card prices</div>
                                </button>
                            </div>
                        </div>

                        {pricingModel === 'DUAL_PRICING' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-stone-300 mb-3">Card Surcharge Type</label>
                                    <div className="flex gap-4">
                                        <button onClick={() => setSurchargeType('PERCENTAGE')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${surchargeType === 'PERCENTAGE' ? 'border-orange-500 bg-orange-500/10' : 'border-stone-700 hover:border-stone-600'}`}>
                                            <div className="font-semibold text-stone-200">Percentage (%)</div>
                                        </button>
                                        <button onClick={() => setSurchargeType('FLAT_AMOUNT')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${surchargeType === 'FLAT_AMOUNT' ? 'border-orange-500 bg-orange-500/10' : 'border-stone-700 hover:border-stone-600'}`}>
                                            <div className="font-semibold text-stone-200">Flat Amount ($)</div>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-stone-300 mb-2">{surchargeType === 'PERCENTAGE' ? 'Surcharge Percentage' : 'Surcharge Amount'}</label>
                                    <div className="relative flex-1 max-w-xs">
                                        <input type="number" step="0.01" value={surchargeValue} onChange={(e) => setSurchargeValue(e.target.value)} className="w-full px-4 py-3 pr-12 border-2 border-stone-700 bg-stone-800 rounded-lg focus:border-orange-500 focus:outline-none text-lg font-semibold text-stone-100" />
                                        <span className="absolute right-4 top-3 text-stone-500 text-lg">{surchargeType === 'PERCENTAGE' ? '%' : '$'}</span>
                                    </div>
                                </div>
                                <div className="bg-stone-800/50 p-6 rounded-xl border border-stone-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-5 w-5 text-orange-400" />
                                        <div className="font-bold text-stone-200">Pricing Preview</div>
                                    </div>
                                    <p className="text-stone-400 mb-2">Example: $100 service</p>
                                    <div className="flex gap-6">
                                        <div><div className="text-sm text-stone-500">Cash Price</div><div className="text-2xl font-bold text-emerald-400">$100.00</div></div>
                                        <div><div className="text-sm text-stone-500">Card Price</div><div className="text-2xl font-bold text-blue-400">${calculateCardPrice(100).toFixed(2)}</div></div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="mt-6 pt-6 border-t border-stone-700">
                            <label className="block text-sm font-semibold text-stone-300 mb-2">Sales Tax Rate</label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1 max-w-xs">
                                    <input type="number" step="0.01" min="0" max="25" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-full px-4 py-3 pr-12 border-2 border-stone-700 bg-stone-800 rounded-lg focus:border-orange-500 focus:outline-none text-lg font-semibold text-stone-100" />
                                    <span className="absolute right-4 top-3 text-stone-500 text-lg">%</span>
                                </div>
                                <div className="text-sm text-stone-400">Example: $100 item &rarr; ${(100 * (1 + parseFloat(taxRate || '0') / 100)).toFixed(2)} with tax</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tip Settings */}
                <div className="glass-panel rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-100">Tip Settings</h2>
                            <p className="text-sm text-stone-400">Configure tip prompt on customer display</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                        <div><div className="font-semibold text-stone-200">Enable Tip Prompt</div><div className="text-sm text-stone-400">Show tip options on customer display during checkout</div></div>
                        <button onClick={() => setTipEnabled(!tipEnabled)} className={`relative w-14 h-8 rounded-full transition-all ${tipEnabled ? 'bg-green-500' : 'bg-stone-600'}`}>
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${tipEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    {tipEnabled && (
                        <div className="mt-4 space-y-4">
                            <div className="flex gap-4">
                                <button onClick={() => setTipType('PERCENT')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${tipType === 'PERCENT' ? 'border-green-500 bg-green-500/10' : 'border-stone-700'}`}><div className="font-semibold text-stone-200">Percentage (%)</div></button>
                                <button onClick={() => setTipType('DOLLAR')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${tipType === 'DOLLAR' ? 'border-green-500 bg-green-500/10' : 'border-stone-700'}`}><div className="font-semibold text-stone-200">Dollar Amount ($)</div></button>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-stone-300 mb-2">Tip Suggestions ({tipType === 'PERCENT' ? 'percentages' : 'dollar amounts'})</label>
                                <input type="text" value={tipSuggestions} onChange={(e) => setTipSuggestions(e.target.value)} placeholder={tipType === 'PERCENT' ? '15,18,20,25' : '2,5,10,15'} className="w-full max-w-sm px-4 py-3 border-2 border-stone-700 bg-stone-800 rounded-lg focus:border-green-500 focus:outline-none text-stone-100" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Receipt Printing */}
                <div className="glass-panel rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <Printer className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-100">Receipt Printing</h2>
                            <p className="text-sm text-stone-400">Configure auto-print and cash drawer behavior</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {[
                            { id: 'ALL', label: 'All Transactions', desc: 'Print every receipt' },
                            { id: 'CARD_ONLY', label: 'Card Only', desc: 'Credit/Debit only' },
                            { id: 'EBT_ONLY', label: 'EBT Only', desc: 'EBT transactions' },
                            { id: 'CARD_AND_EBT', label: 'Card & EBT', desc: 'Card and EBT only' },
                            { id: 'NONE', label: 'Never', desc: 'Use Last Receipt button' },
                        ].map(mode => (
                            <button key={mode.id} onClick={() => setReceiptPrintMode(mode.id)} className={`p-3 rounded-lg border-2 transition-all text-left ${receiptPrintMode === mode.id ? 'border-purple-500 bg-purple-500/10' : 'border-stone-700 hover:border-stone-600'}`}>
                                <div className="font-semibold text-sm text-stone-200">{mode.label}</div>
                                <div className="text-xs text-stone-500">{mode.desc}</div>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center"><DollarSign className="h-5 w-5 text-green-400" /></div>
                            <div><div className="font-bold text-stone-200">Open Drawer on Cash</div><div className="text-sm text-stone-400">Automatically open cash drawer</div></div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={openDrawerOnCash} onChange={(e) => setOpenDrawerOnCash(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>

                {/* Save Button */}
                {canEdit && (
                    <div className="mb-6">
                        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-lg">
                            <Save className="h-6 w-6" />
                            {saving ? 'Saving...' : 'Save All Settings'}
                        </button>
                    </div>
                )}

                {/* Employee Permissions */}
                <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-100">Employee Permissions</h2>
                            <p className="text-sm text-stone-400">Manage shift and time tracking permissions</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-stone-700">
                                    <th className="text-left p-3 font-semibold text-stone-300">Employee</th>
                                    <th className="text-center p-3 font-semibold text-stone-300">Manage Shifts</th>
                                    <th className="text-center p-3 font-semibold text-stone-300">Clock In</th>
                                    <th className="text-center p-3 font-semibold text-stone-300">Clock Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(employee => (
                                    <tr key={employee.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                                        <td className="p-3">
                                            <div className="font-semibold text-stone-200">{employee.name}</div>
                                            <div className="text-sm text-stone-500">{employee.email}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <input type="checkbox" checked={employee.canManageShifts || false} onChange={(e) => updateEmployeePermission(employee.id, 'canManageShifts', e.target.checked)} className="h-5 w-5 text-orange-500 rounded focus:ring-orange-500" />
                                        </td>
                                        <td className="p-3 text-center">
                                            <input type="checkbox" checked={employee.canClockIn !== false} onChange={(e) => updateEmployeePermission(employee.id, 'canClockIn', e.target.checked)} className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500" />
                                        </td>
                                        <td className="p-3 text-center">
                                            <input type="checkbox" checked={employee.canClockOut !== false} onChange={(e) => updateEmployeePermission(employee.id, 'canClockOut', e.target.checked)} className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
