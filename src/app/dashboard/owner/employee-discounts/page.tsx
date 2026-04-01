'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Percent, Save, RefreshCw, Lock } from 'lucide-react'

export default function EmployeeDiscountsPage() {
    const { data: session } = useSession()
    const role = (session?.user as any)?.role
    const canEdit = role === 'OWNER' || role === 'MANAGER' || role === 'PROVIDER'
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/franchise/employees').then(r => r.json()).then(d => {
            setEmployees(d.data?.employees || d.employees || [])
            setLoading(false)
        })
    }, [])

    const updateDiscount = async (empId: string, pct: number, enabled: boolean) => {
        await fetch('/api/pos/employee-discount', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: empId, discountPercent: pct, enabled })
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><Percent className="h-8 w-8 text-pink-500" /> Employee Discounts</h1>
                    <p className="text-stone-400">Set per-employee purchase discount rates</p>
                </div>
            </div>

            {!canEdit && (
                <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Lock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-400">View only — only Owners and Managers can modify employee discount rates.</p>
                </div>
            )}

            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                {loading ? <div className="text-center py-12"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div> : (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">Employee</th>
                            <th className="text-left py-3 px-4 text-stone-400">Role</th>
                            <th className="text-center py-3 px-4 text-stone-400">Enabled</th>
                            <th className="text-center py-3 px-4 text-stone-400">Discount %</th>
                            <th className="text-center py-3 px-4 text-stone-400">Save</th>
                        </tr></thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-b border-stone-800">
                                    <td className="py-3 px-4 font-medium">{emp.name || emp.email}</td>
                                    <td className="py-3 px-4 text-stone-400">{emp.role}</td>
                                    <td className="py-3 px-4 text-center">
                                        <input type="checkbox" defaultChecked={emp.employeeDiscountEnabled}
                                            onChange={e => { emp.employeeDiscountEnabled = e.target.checked }}
                                            disabled={!canEdit}
                                            className="w-4 h-4 rounded disabled:opacity-50 disabled:cursor-not-allowed" />
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {canEdit ? (
                                            <input type="number" defaultValue={emp.employeeDiscountPct || 0} min="0" max="100" step="1"
                                                onChange={e => { emp.employeeDiscountPct = parseFloat(e.target.value) }}
                                                className="w-20 bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-center" />
                                        ) : (
                                            <span className="text-stone-400">{emp.employeeDiscountPct || 0}%</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {canEdit ? (
                                            <button onClick={() => updateDiscount(emp.id, emp.employeeDiscountPct || 0, emp.employeeDiscountEnabled || false)}
                                                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs"><Save className="h-3 w-3 inline" /></button>
                                        ) : (
                                            <span className="text-stone-600 text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
