'use client'

import { useState, useEffect } from 'react'
import { Download, Search, Users, Loader2 } from 'lucide-react'
import { withReportPermission } from '@/components/reports/WithReportPermission'
import jsPDF from 'jspdf'

function CustomerListReportPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true)
            try {
                // api/clients supports search param
                const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
                const res = await fetch(`/api/clients${query}`)
                if (res.ok) {
                    const data = await res.json()
                    const clientsArray = Array.isArray(data) ? data : (data.clients || data.data || [])
                    const formatted = clientsArray.map((c: any) => ({
                        id: c.id,
                        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
                        email: c.email || '',
                        phone: c.phone || '',
                        visits: c._count?.appointments || 0,
                        lastVisit: c.lastVisit || 'Never',
                        loyaltyMember: !!c.loyaltyJoined || !!c.loyalty,
                        points: c.loyalty?.points || 0
                    }))
                    setCustomers(formatted)
                }
            } catch (error) {
                console.error('Failed to fetch customers:', error)
            } finally {
                setLoading(false)
            }
        }

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchCustomers()
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Visits', 'Last Visit', 'Loyalty Status', 'Points']
        const csvContent = [
            headers.join(','),
            ...customers.map(c => [
                `"${c.name}"`,
                `"${c.email}"`,
                `"${c.phone}"`,
                c.visits,
                `"${c.lastVisit}"`,
                c.loyaltyMember ? 'Member' : 'Not Enrolled',
                c.points
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `customer_list_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Customer List Report', 20, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
        yPos += 15

        // Headers
        const headers = ['Name', 'Email', 'Phone', 'Visits', 'Points']
        const xPos = [20, 60, 110, 150, 170]

        doc.setFont('helvetica', 'bold')
        headers.forEach((h, i) => doc.text(h, xPos[i], yPos))
        yPos += 7
        doc.line(20, yPos - 5, 190, yPos - 5) // Header underline

        // Rows
        doc.setFont('helvetica', 'normal')
        customers.forEach((c) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
                // Re-print headers? Optional but good.
                doc.setFont('helvetica', 'bold')
                headers.forEach((h, i) => doc.text(h, xPos[i], yPos))
                yPos += 7
            }

            const name = c.name.length > 20 ? c.name.substring(0, 17) + '...' : c.name
            const email = c.email.length > 25 ? c.email.substring(0, 22) + '...' : c.email

            doc.text(name, xPos[0], yPos)
            doc.text(email, xPos[1], yPos)
            doc.text(c.phone, xPos[2], yPos)
            doc.text(String(c.visits), xPos[3], yPos)
            doc.text(String(c.points), xPos[4], yPos)
            yPos += 6
        })

        doc.save(`customer_list_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="p-8 space-y-6 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-500" />
                        Customer List Report
                    </h1>
                    <p className="text-stone-400 mt-2">Comprehensive list of all registered customers with metrics</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportToPDF}
                        disabled={customers.length === 0}
                        className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-700"
                    >
                        <Download className="h-5 w-5" />
                        PDF
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={customers.length === 0}
                        className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-700"
                    >
                        <Download className="h-5 w-5" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl border border-stone-800 bg-stone-900/50">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden border border-stone-800 bg-stone-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/80 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4 text-right">Visits</th>
                                <th className="px-6 py-4 text-right">Last Visit</th>
                                <th className="px-6 py-4 text-center">Loyalty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                            <p className="text-stone-500">Loading customers...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                                        No customers found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-stone-200 block text-base">{customer.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-stone-300">{customer.email}</div>
                                                <div className="text-stone-500 text-xs">{customer.phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-stone-100">{customer.visits}</td>
                                        <td className="px-6 py-4 text-right">{customer.lastVisit}</td>
                                        <td className="px-6 py-4 text-center">
                                            {customer.loyaltyMember ? (
                                                <div>
                                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Member
                                                    </span>
                                                    <p className="text-xs text-stone-500 mt-1">{customer.points} pts</p>
                                                </div>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-stone-500/10 text-stone-400 border border-stone-500/20">
                                                    Not Enrolled
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default withReportPermission(CustomerListReportPage, 'operational')
