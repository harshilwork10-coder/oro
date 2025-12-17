'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, DollarSign, Users, Shield, Save, AlertCircle, FileText } from 'lucide-react'

export default function SettingsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Pricing Settings
    const [pricingModel, setPricingModel] = useState('DUAL_PRICING')
    const [surchargeType, setSurchargeType] = useState('PERCENTAGE')
    const [surchargeValue, setSurchargeValue] = useState('3.99')

    // Tip Settings
    const [tipEnabled, setTipEnabled] = useState(true)
    const [tipType, setTipType] = useState('PERCENT')
    const [tipSuggestions, setTipSuggestions] = useState('15,20,25')

    // Payment Options
    const [acceptsEbt, setAcceptsEbt] = useState(false)
    const [acceptsChecks, setAcceptsChecks] = useState(false)
    const [acceptsOnAccount, setAcceptsOnAccount] = useState(false)

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
                    // Tip settings
                    setTipEnabled(data.tipPromptEnabled ?? true)
                    setTipType(data.tipType || 'PERCENT')
                    setTipSuggestions(data.tipSuggestions?.replace(/[\[\]]/g, '') || '15,20,25')
                    // Payment settings
                    setAcceptsEbt(data.acceptsEbt ?? false)
                    setAcceptsChecks(data.acceptsChecks ?? false)
                    setAcceptsOnAccount(data.acceptsOnAccount ?? false)
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
                    // Tip settings
                    tipPromptEnabled: tipEnabled,
                    tipType,
                    tipSuggestions: `[${tipSuggestions}]`,
                    // Payment settings
                    acceptsEbt,
                    acceptsChecks,
                    acceptsOnAccount
                })
            })

            if (res.ok) {
                setMessage('✅ Settings saved successfully!')
            } else {
                setMessage('❌ Failed to save settings')
            }
        } catch (error) {
            setMessage('❌ Error saving settings')
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
                body: JSON.stringify({
                    employeeId,
                    permission,
                    value
                })
            })

            if (res.ok) {
                // Update local state
                setEmployees(prev => prev.map(emp =>
                    emp.id === employeeId
                        ? { ...emp, [permission]: value }
                        : emp
                ))
                setMessage('✅ Permission updated!')
                setTimeout(() => setMessage(''), 2000)
            }
        } catch (error) {
            setMessage('❌ Failed to update permission')
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
        return (
            <div className="p-8">
                <div className="animate-pulse">Loading settings...</div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Franchise Settings
            </h1>

            {message && (
                <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* Pricing Configuration */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Pricing Configuration</h2>
                        <p className="text-gray-600">Configure card surcharge for your franchise</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Pricing Model */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Pricing Model</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setPricingModel('STANDARD')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all ${pricingModel === 'STANDARD'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-bold">Standard Pricing</div>
                                <div className="text-sm text-gray-600">Single price for all payment types</div>
                            </button>
                            <button
                                onClick={() => setPricingModel('DUAL_PRICING')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all ${pricingModel === 'DUAL_PRICING'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-bold">Dual Pricing</div>
                                <div className="text-sm text-gray-600">Separate cash and card prices</div>
                            </button>
                        </div>
                    </div>

                    {pricingModel === 'DUAL_PRICING' && (
                        <>
                            {/* Surcharge Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Card Surcharge Type</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSurchargeType('PERCENTAGE')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${surchargeType === 'PERCENTAGE'
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-semibold">Percentage (%)</div>
                                    </button>
                                    <button
                                        onClick={() => setSurchargeType('FLAT_AMOUNT')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${surchargeType === 'FLAT_AMOUNT'
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-semibold">Flat Amount ($)</div>
                                    </button>
                                </div>
                            </div>

                            {/* Surcharge Value */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {surchargeType === 'PERCENTAGE' ? 'Surcharge Percentage' : 'Surcharge Amount'}
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1 max-w-xs">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={surchargeValue}
                                            onChange={(e) => setSurchargeValue(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none text-lg font-semibold"
                                        />
                                        <span className="absolute right-4 top-3 text-gray-500 text-lg">
                                            {surchargeType === 'PERCENTAGE' ? '%' : '$'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    <div className="font-bold text-orange-900">Pricing Preview</div>
                                </div>
                                <div className="text-gray-700">
                                    <p className="mb-2">Example: $100 service</p>
                                    <div className="flex gap-6">
                                        <div>
                                            <div className="text-sm text-gray-600">Cash Price</div>
                                            <div className="text-2xl font-bold text-emerald-700">$100.00</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600">Card Price</div>
                                            <div className="text-2xl font-bold text-blue-700">
                                                ${calculateCardPrice(100).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tip Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Tip Settings</h2>
                        <p className="text-gray-600">Configure tip prompt on customer display</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Tip Enable/Disable */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <div className="font-semibold">Enable Tip Prompt</div>
                            <div className="text-sm text-gray-600">Show tip options on customer display during checkout</div>
                        </div>
                        <button
                            onClick={() => setTipEnabled(!tipEnabled)}
                            className={`relative w-14 h-8 rounded-full transition-all ${tipEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${tipEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {tipEnabled && (
                        <>
                            {/* Tip Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Tip Type</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setTipType('PERCENT')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${tipType === 'PERCENT'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-semibold">Percentage (%)</div>
                                    </button>
                                    <button
                                        onClick={() => setTipType('DOLLAR')}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${tipType === 'DOLLAR'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-semibold">Dollar Amount ($)</div>
                                    </button>
                                </div>
                            </div>

                            {/* Tip Suggestions */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tip Suggestions ({tipType === 'PERCENT' ? 'percentages' : 'dollar amounts'})
                                </label>
                                <input
                                    type="text"
                                    value={tipSuggestions}
                                    onChange={(e) => setTipSuggestions(e.target.value)}
                                    placeholder={tipType === 'PERCENT' ? '15,18,20,25' : '2,5,10,15'}
                                    className="w-full max-w-sm px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                                />
                                <p className="text-sm text-gray-500 mt-2">Enter comma-separated values (e.g., 15,20,25)</p>
                            </div>

                            {/* Preview */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                                <div className="font-bold text-green-900 mb-3">Tip Options Preview</div>
                                <div className="flex gap-3">
                                    {tipSuggestions.split(',').map((tip, i) => (
                                        <div key={i} className="px-4 py-2 bg-white border border-green-300 rounded-lg font-semibold text-green-700">
                                            {tipType === 'PERCENT' ? `${tip.trim()}%` : `$${tip.trim()}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Payment Methods</h2>
                        <p className="text-gray-600">Enable or disable additional payment types</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">Accept EBT</div>
                                <div className="text-sm text-gray-500">Allow Electronic Benefit Transfer cards</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptsEbt}
                                onChange={(e) => setAcceptsEbt(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">Accept Checks</div>
                                <div className="text-sm text-gray-500">Allow payment via personal or business checks</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptsChecks}
                                onChange={(e) => setAcceptsChecks(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">On Account / Store Credit</div>
                                <div className="text-sm text-gray-500">Allow customers to pay using store credit or account balance</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptsOnAccount}
                                onChange={(e) => setAcceptsOnAccount(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Save All Settings Button */}
            <div className="mb-8">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-lg"
                >
                    <Save className="h-6 w-6" />
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            {/* Employee Permissions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Employee Permissions</h2>
                        <p className="text-gray-600">Manage shift and time tracking permissions</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="text-left p-3 font-semibold">Employee</th>
                                <th className="text-center p-3 font-semibold">Manage Shifts</th>
                                <th className="text-center p-3 font-semibold">Clock In</th>
                                <th className="text-center p-3 font-semibold">Clock Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(employee => (
                                <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="font-semibold">{employee.name}</div>
                                        <div className="text-sm text-gray-500">{employee.email}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={employee.canManageShifts || false}
                                            onChange={(e) => updateEmployeePermission(employee.id, 'canManageShifts', e.target.checked)}
                                            className="h-5 w-5 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={employee.canClockIn !== false}
                                            onChange={(e) => updateEmployeePermission(employee.id, 'canClockIn', e.target.checked)}
                                            className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={employee.canClockOut !== false}
                                            onChange={(e) => updateEmployeePermission(employee.id, 'canClockOut', e.target.checked)}
                                            className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
