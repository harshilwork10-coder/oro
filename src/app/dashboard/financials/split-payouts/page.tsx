'use client'

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'

export default function SplitPayoutsPage() {
    const [loading, setLoading] = useState(false)
    const [splitConfig, setSplitConfig] = useState({
        enabled: false,
        percentage: 50
    })

    const handleSave = async () => {
        setLoading(true)
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLoading(false)
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-stone-100 mb-2">Split Payout Configuration</h1>
                <p className="text-stone-400 mb-8">Configure revenue sharing and payout splits for franchisees</p>

                <div className="glass-panel p-6 rounded-xl">
                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={splitConfig.enabled}
                                    onChange={(e) => setSplitConfig({ ...splitConfig, enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-stone-700 bg-stone-800 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-stone-200 font-medium">Enable Split Payouts</span>
                            </label>
                        </div>

                        {splitConfig.enabled && (
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Split Percentage
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={splitConfig.percentage}
                                    onChange={(e) => setSplitConfig({ ...splitConfig, percentage: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5" />
                                        Save Configuration
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

