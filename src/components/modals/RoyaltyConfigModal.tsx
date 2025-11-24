'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Loader2, Save } from 'lucide-react'

interface RoyaltyConfigModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function RoyaltyConfigModal({ isOpen, onClose, onSuccess }: RoyaltyConfigModalProps) {
    const [formData, setFormData] = useState({
        percentage: '',
        minimumMonthlyFee: '',
        calculationPeriod: 'MONTHLY'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [existingConfig, setExistingConfig] = useState<any>(null)

    useEffect(() => {
        if (isOpen) {
            fetchConfig()
        }
    }, [isOpen])

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/franchisor/royalty-config')
            if (response.ok) {
                const config = await response.json()
                if (config) {
                    setExistingConfig(config)
                    setFormData({
                        percentage: config.percentage.toString(),
                        minimumMonthlyFee: config.minimumMonthlyFee ? config.minimumMonthlyFee.toString() : '',
                        calculationPeriod: config.calculationPeriod
                    })
                }
            }
        } catch (err) {
            console.error('Error fetching config:', err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/franchisor/royalty-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    percentage: parseFloat(formData.percentage),
                    minimumMonthlyFee: formData.minimumMonthlyFee ? parseFloat(formData.minimumMonthlyFee) : null,
                    calculationPeriod: formData.calculationPeriod
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to save configuration')
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Royalty Configuration</h2>
                        <p className="text-sm text-gray-600">
                            {existingConfig ? 'Update' : 'Set up'} your royalty settings
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Royalty Percentage (%) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.percentage}
                            onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            placeholder="6.0"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Percentage of gross revenue owed as royalty
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Monthly Fee (Optional)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.minimumMonthlyFee}
                                onChange={(e) => setFormData({ ...formData, minimumMonthlyFee: e.target.value })}
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum amount franchisee must pay per month
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calculation Period *
                        </label>
                        <select
                            value={formData.calculationPeriod}
                            onChange={(e) => setFormData({ ...formData, calculationPeriod: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            <option value="MONTHLY">Monthly</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="DAILY">Daily</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            How often royalties are calculated
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    {existingConfig ? 'Update' : 'Save'} Configuration
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
