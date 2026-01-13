'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    ArrowLeft,
    RefreshCw,
    Search,
    User,
    AlertTriangle,
    CreditCard,
    ChevronRight,
    FileDown
} from 'lucide-react'
import jsPDF from 'jspdf'
import Link from 'next/link'

interface StoreAccount {
    id: string
    name: string
    phone: string
    email: string
    balance: number
    limit: number
    transactionCount: number
    approvedAt: string
}

export default function ARSummaryPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [accounts, setAccounts] = useState<StoreAccount[]>([])
    const [totals, setTotals] = useState({ totalAccounts: 0, totalOutstanding: 0, accountsWithBalance: 0 })
    const [filter, setFilter] = useState('outstanding')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
    const [accountDetails, setAccountDetails] = useState<any>(null)

    useEffect(() => {
        fetchAccounts()
    }, [filter])

    const fetchAccounts = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/store-accounts?filter=${filter}`)
            if (res.ok) {
                const data = await res.json()
                setAccounts(data.data.accounts || [])
                setTotals(data.data.totals || { totalAccounts: 0, totalOutstanding: 0, accountsWithBalance: 0 })
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAccountDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/store-accounts/${id}`)
            if (res.ok) {
                const data = await res.json()
                setAccountDetails(data)
                setSelectedAccount(id)
            }
        } catch (error) {
            console.error('Failed to fetch details:', error)
        }
    }

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone?.includes(searchTerm)
    )

    const exportCSV = () => {
        const headers = ['Name', 'Phone', 'Balance', 'Limit', 'Last Approved']
        const csvContent = [
            headers.join(','),
            ...filtered.map(a => [
                `"${a.name}"`,
                `"${a.phone || ''}"`,
                a.balance.toFixed(2),
                a.limit,
                `"${a.approvedAt || ''}"`
            ].join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ar_summary_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20
        doc.setFontSize(18)
        doc.text('A/R Summary Report', 20, yPos)
        yPos += 10
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
        yPos += 10

        const headers = ['Name', 'Phone', 'Balance', 'Limit']
        const xPos = [20, 80, 130, 170]
        doc.setFont('helvetica', 'bold')
        headers.forEach((h, i) => doc.text(h, xPos[i], yPos))
        yPos += 7
        doc.line(20, yPos - 5, 190, yPos - 5)

        doc.setFont('helvetica', 'normal')
        filtered.forEach(a => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(a.name.substring(0, 30), xPos[0], yPos)
            doc.text(a.phone || '-', xPos[1], yPos)
            doc.text(`$${a.balance.toFixed(2)}`, xPos[2], yPos)
            doc.text(`$${a.limit}`, xPos[3], yPos)
            yPos += 7
        })
        doc.save(`ar_summary_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/customer" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            A/R Summary (Store Accounts)
                        </h1>
                        <p className="text-gray-400 mt-1">Customers with store accounts and balances</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToPDF} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white" title="Export PDF">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={exportCSV} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white" title="Export Excel">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={fetchAccounts} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Accounts</p>
                    <p className="text-2xl font-bold text-white">{totals.totalAccounts}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">With Balance</p>
                    <p className="text-2xl font-bold text-orange-400">{totals.accountsWithBalance}</p>
                </div>
                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                    <p className="text-red-300 text-sm">Total Outstanding</p>
                    <p className="text-2xl font-bold text-red-400">${totals.totalOutstanding.toFixed(2)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="all">All Accounts</option>
                    <option value="outstanding">With Balance</option>
                    <option value="zero">Zero Balance</option>
                </select>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-2 gap-6">
                {/* Accounts List */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-700/50 px-4 py-3 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Store Accounts</h3>
                    </div>
                    <div className="divide-y divide-gray-700 max-h-[500px] overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
                        ) : filtered.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">No store accounts found</div>
                        ) : (
                            filtered.map((account) => (
                                <div
                                    key={account.id}
                                    onClick={() => fetchAccountDetails(account.id)}
                                    className={`px-4 py-3 cursor-pointer hover:bg-gray-700/30 flex items-center justify-between ${selectedAccount === account.id ? 'bg-purple-900/20 border-l-2 border-purple-500' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <p className="text-white font-medium">{account.name}</p>
                                            <p className="text-gray-500 text-xs">{account.phone || 'No phone'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className={`font-medium ${account.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                ${account.balance.toFixed(2)}
                                            </p>
                                            <p className="text-gray-500 text-xs">Limit: ${account.limit}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-700/50 px-4 py-3 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Account Details</h3>
                    </div>
                    {!accountDetails ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            Select an account to view details
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-white">{accountDetails.name}</p>
                                    <p className="text-gray-400 text-sm">{accountDetails.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-bold ${accountDetails.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        ${accountDetails.balance.toFixed(2)}
                                    </p>
                                    <p className="text-gray-500 text-xs">of ${accountDetails.limit} limit</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Transactions</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {accountDetails.transactions.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No transactions yet</p>
                                    ) : (
                                        accountDetails.transactions.map((tx: any) => (
                                            <div key={tx.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2">
                                                <div>
                                                    <p className={`text-sm font-medium ${tx.type === 'CHARGE' ? 'text-red-400' : 'text-green-400'}`}>
                                                        {tx.type === 'CHARGE' ? '+ Charge' : '- Payment'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(tx.createdAt).toLocaleDateString()} • {tx.employeeName}
                                                    </p>
                                                </div>
                                                <p className={`font-medium ${tx.type === 'CHARGE' ? 'text-red-400' : 'text-green-400'}`}>
                                                    ${tx.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
