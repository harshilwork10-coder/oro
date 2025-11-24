'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, DollarSign, Users, Shield, Save, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Pricing Settings
    const [pricingModel, setPricingModel] = useState('DUAL_PRICING')
    const [surchargeType, setSurchargeType] = useState('PERCENTAGE')
    const [surchargeValue, setSurchargeValue] = useState('3.99')

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
                    setPricingModel(data.pricingModel || 'DUAL_PRICING')
                    setSurchargeType(data.cardSurchargeType || 'PERCENTAGE')
                    setSurchargeValue(data.cardSurcharge?.toString() || '3.99')
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

    const savePricingSettings = async () => {
        setSaving(true)
        setMessage('')

        try {
            const res = await fetch('/api/settings/franchise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pricingModel,
                    cardSurchargeType: surchargeType,
                    cardSurcharge: parseFloat(surchargeValue)
                })
            })

            if (res.ok) {
                setMessage('✅ Pricing settings saved successfully!')
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

                    {/* Save Button */}
                    <button
                        onClick={savePricingSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Saving...' : 'Save Pricing Settings'}
                    </button>
                </div>
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
