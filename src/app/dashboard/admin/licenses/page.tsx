'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Terminal, CreditCard, Shield, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import CreateLicenseModal from '@/components/modals/CreateLicenseModal'

interface License {
    id: string
    licenseKey: string
    customerName: string
    status: string
    maxTerminals: number | null
    terminals: any[]
    expiresAt: string | null
    location?: { name: string }
}

export default function LicenseManagementPage() {
    const [licenses, setLicenses] = useState<License[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchLicenses()
    }, [])

    const fetchLicenses = async () => {
        try {
            const res = await fetch('/api/admin/licenses')
            const data = await res.json()
            if (data.licenses) {
                setLicenses(data.licenses)
            }
        } catch (error) {
            console.error('Failed to fetch licenses:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredLicenses = licenses.filter(l =>
        l.licenseKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleStatusToggle = async (license: License) => {
        const newStatus = license.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return

        try {
            const res = await fetch('/api/admin/licenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseId: license.id,
                    status: newStatus
                })
            })

            if (res.ok) {
                fetchLicenses()
            } else {
                alert('Failed to update status')
            }
        } catch (error) {
            console.error('Update status error:', error)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">License Management</h1>
                    <p className="text-stone-400">Manage POS licenses and terminal allocations</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Create License
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-stone-400 text-sm">Active Licenses</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {licenses.filter(l => l.status === 'ACTIVE').length}
                    </p>
                </div>
                <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Terminal className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-stone-400 text-sm">Active Terminals</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {licenses.reduce((acc, l) => acc + l.terminals.length, 0)}
                    </p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search licenses, customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <button
                    onClick={fetchLicenses}
                    className="p-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-400 hover:text-white"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* Licenses Table */}
            <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-stone-950 text-stone-400 text-sm">
                        <tr>
                            <th className="p-4 font-medium">License Key</th>
                            <th className="p-4 font-medium">Customer</th>
                            <th className="p-4 font-medium">Terminals</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Expires</th>
                            <th className="p-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-stone-500">Loading licenses...</td>
                            </tr>
                        ) : filteredLicenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-stone-500">No licenses found</td>
                            </tr>
                        ) : (
                            filteredLicenses.map(license => (
                                <tr key={license.id} className="hover:bg-stone-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-mono text-emerald-400 font-medium">
                                            {license.licenseKey}
                                        </div>
                                        {license.location && (
                                            <div className="text-xs text-stone-500 mt-1">
                                                {license.location.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-white">
                                        {license.customerName || 'Unassigned'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{license.terminals.length}</span>
                                            <span className="text-stone-500">/ {license.maxTerminals === null ? '∞' : license.maxTerminals}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${license.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                                            license.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' :
                                                'bg-stone-700 text-stone-300'
                                            }`}>
                                            {license.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-stone-400 text-sm">
                                        {license.expiresAt ? format(new Date(license.expiresAt), 'MMM d, yyyy') : 'Never'}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleStatusToggle(license)}
                                            className={`text-sm font-medium ${license.status === 'ACTIVE'
                                                    ? 'text-red-400 hover:text-red-300'
                                                    : 'text-emerald-400 hover:text-emerald-300'
                                                }`}
                                        >
                                            {license.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <CreateLicenseModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchLicenses()
                    // Don't close immediately so they can copy the key
                }}
            />
        </div>
    )
}

