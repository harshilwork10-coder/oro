'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Check, X, Settings, Save, Users, Building2, Package, Plus, Minus, CreditCard } from 'lucide-react'

interface SmsPackage {
    name: string
    credits: number
    price: number
}

interface FranchiseSms {
    id: string
    name: string
    ownerName: string
    ownerEmail: string
    locationCount: number
    smsEnabled: boolean
    smsApproved: boolean
    smsRequestedAt: string | null
    creditsRemaining: number
    creditsUsed: number
}

export default function ProviderSmsPage() {
    const [packages, setPackages] = useState<SmsPackage[]>([
        { name: 'Starter', credits: 100, price: 4.99 },
        { name: 'Growth', credits: 200, price: 8.99 },
        { name: 'Business', credits: 500, price: 19.99 },
        { name: 'Enterprise', credits: 1000, price: 34.99 }
    ])
    const [franchises, setFranchises] = useState<FranchiseSms[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [activeTab, setActiveTab] = useState<'packages' | 'franchises'>('packages')
    const [addCreditsModal, setAddCreditsModal] = useState<{ franchise: FranchiseSms; credits: number } | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [packagesRes, franchisesRes] = await Promise.all([
                fetch('/api/provider/sms-packages'),
                fetch('/api/provider/sms-requests')
            ])

            if (packagesRes.ok) {
                const data = await packagesRes.json()
                if (data.packages) setPackages(data.packages)
            }
            if (franchisesRes.ok) setFranchises(await franchisesRes.json())
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const savePackages = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/provider/sms-packages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packages })
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error('Error saving:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleApproval = async (franchiseId: string, approve: boolean) => {
        try {
            const res = await fetch('/api/provider/sms-requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ franchiseId, approve })
            })
            if (res.ok) fetchData()
        } catch (error) {
            console.error('Error updating approval:', error)
        }
    }

    const addCredits = async (franchiseId: string, credits: number) => {
        try {
            const res = await fetch('/api/provider/sms-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ franchiseId, credits })
            })
            if (res.ok) {
                fetchData()
                setAddCreditsModal(null)
            }
        } catch (error) {
            console.error('Error adding credits:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="text-orange-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-emerald-500" />
                        SMS Management
                    </h1>
                    <p className="text-stone-400 mt-2">Set package prices and manage franchise SMS credits</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <p className="text-blue-300 text-sm">
                    <strong>💡 How it works:</strong> Set your SMS package prices below. Franchises see these prices and request SMS access.
                    You collect payment separately, then approve and add their credits here.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('packages')}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'packages'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                >
                    <Package className="h-5 w-5" />
                    Package Pricing
                </button>
                <button
                    onClick={() => setActiveTab('franchises')}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${activeTab === 'franchises'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                >
                    <Users className="h-5 w-5" />
                    Franchise Credits
                    {franchises.filter(f => f.smsRequestedAt && !f.smsApproved).length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                            {franchises.filter(f => f.smsRequestedAt && !f.smsApproved).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Package Pricing */}
            {activeTab === 'packages' && (
                <div className="max-w-4xl">
                    <div className="glass-panel rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">SMS Package Pricing</h2>
                            <button
                                onClick={savePackages}
                                disabled={saving}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Prices'}
                            </button>
                        </div>

                        <p className="text-stone-400 text-sm mb-6">
                            Set the prices franchises will see when requesting SMS. You handle payment separately.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {packages.map((pkg, index) => (
                                <div key={index} className="bg-stone-900/50 border border-stone-800 rounded-xl p-5">
                                    <input
                                        type="text"
                                        value={pkg.name}
                                        onChange={(e) => {
                                            const updated = [...packages]
                                            updated[index].name = e.target.value
                                            setPackages(updated)
                                        }}
                                        className="w-full bg-transparent border-none text-white font-semibold text-lg mb-4 focus:outline-none"
                                        placeholder="Package Name"
                                    />

                                    <div className="mb-3">
                                        <label className="text-xs text-stone-400 mb-1 block">SMS Credits</label>
                                        <input
                                            type="number"
                                            value={pkg.credits}
                                            onChange={(e) => {
                                                const updated = [...packages]
                                                updated[index].credits = parseInt(e.target.value) || 0
                                                setPackages(updated)
                                            }}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-stone-400 mb-1 block">Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={pkg.price}
                                            onChange={(e) => {
                                                const updated = [...packages]
                                                updated[index].price = parseFloat(e.target.value) || 0
                                                setPackages(updated)
                                            }}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>

                                    <div className="mt-4 text-center">
                                        <span className="text-xs text-stone-500">
                                            ${(pkg.price / pkg.credits * 100).toFixed(2)}/100 SMS
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <p className="text-emerald-300 text-sm">
                                <strong>💰 Your Profit:</strong> Twilio costs ~$0.79/100 SMS. At $4.99/100, you make ~$4.20 profit per package!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Franchise Credits */}
            {activeTab === 'franchises' && (
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-stone-800">
                        <h2 className="text-lg font-semibold text-white">Franchise SMS Credits</h2>
                        <p className="text-sm text-stone-400">Approve requests and add credits after receiving payment</p>
                    </div>

                    {franchises.length === 0 ? (
                        <div className="p-8 text-center text-stone-400">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No franchises found</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-stone-400 text-sm border-b border-stone-800">
                                    <th className="p-4">Franchise</th>
                                    <th className="p-4">Owner</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Used</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {franchises.map((f) => (
                                    <tr key={f.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                                        <td className="p-4">
                                            <p className="font-medium text-white">{f.name}</p>
                                            <p className="text-xs text-stone-500">{f.locationCount} location(s)</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white">{f.ownerName}</p>
                                            <p className="text-sm text-stone-400">{f.ownerEmail}</p>
                                        </td>
                                        <td className="p-4">
                                            {f.smsApproved ? (
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">
                                                    ✓ Active
                                                </span>
                                            ) : f.smsRequestedAt ? (
                                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium">
                                                    ⏳ Requested
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-stone-700 text-stone-400 rounded-full text-sm">
                                                    Not Requested
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-lg font-bold ${f.creditsRemaining > 0 ? 'text-emerald-400' : 'text-stone-500'}`}>
                                                {f.creditsRemaining}
                                            </span>
                                        </td>
                                        <td className="p-4 text-stone-400">{f.creditsUsed}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {!f.smsApproved && f.smsRequestedAt && (
                                                    <button
                                                        onClick={() => handleApproval(f.id, true)}
                                                        className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-sm font-medium flex items-center gap-1"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Approve
                                                    </button>
                                                )}
                                                {f.smsApproved && (
                                                    <>
                                                        <button
                                                            onClick={() => setAddCreditsModal({ franchise: f, credits: 100 })}
                                                            className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-sm font-medium flex items-center gap-1"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Add Credits
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproval(f.id, false)}
                                                            className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg text-sm font-medium flex items-center gap-1"
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Revoke
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Add Credits Modal */}
            {addCreditsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Add SMS Credits</h3>
                        <p className="text-stone-400 mb-6">
                            Adding credits for <strong className="text-white">{addCreditsModal.franchise.name}</strong>
                        </p>

                        {/* Quick Select */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {packages.map((pkg) => (
                                <button
                                    key={pkg.name}
                                    onClick={() => setAddCreditsModal({ ...addCreditsModal, credits: pkg.credits })}
                                    className={`p-3 rounded-lg border text-center transition-all ${addCreditsModal.credits === pkg.credits
                                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                                            : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-600'
                                        }`}
                                >
                                    <p className="font-bold">{pkg.credits}</p>
                                    <p className="text-xs text-stone-400">${pkg.price}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mb-6">
                            <label className="text-sm text-stone-400 mb-2 block">Or enter custom amount:</label>
                            <input
                                type="number"
                                value={addCreditsModal.credits}
                                onChange={(e) => setAddCreditsModal({ ...addCreditsModal, credits: parseInt(e.target.value) || 0 })}
                                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white text-lg"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setAddCreditsModal(null)}
                                className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-lg font-medium hover:bg-stone-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => addCredits(addCreditsModal.franchise.id, addCreditsModal.credits)}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 flex items-center justify-center gap-2"
                            >
                                <CreditCard className="h-5 w-5" />
                                Add {addCreditsModal.credits} Credits
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
