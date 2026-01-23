'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface Employee {
    id: string
    name: string
    initials: string
    avatar?: string | null
    role: string
}

interface EmployeeTilesProps {
    stationToken: string | null
    onEmployeeSelect: (employee: Employee) => void
    isLoading?: boolean
}

/**
 * Employee Tiles Component
 * 
 * Displays employee avatars/initials for quick selection.
 * Tap employee → enter PIN (no typing employee ID needed)
 */
export default function EmployeeTiles({
    stationToken,
    onEmployeeSelect,
    isLoading = false
}: EmployeeTilesProps) {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!stationToken) {
            setLoading(false)
            return
        }

        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/pos/employees-for-login', {
                    headers: {
                        'X-Station-Token': stationToken
                    }
                })

                if (res.ok) {
                    const data = await res.json()
                    setEmployees(data.employees || [])
                } else if (res.status === 403) {
                    setError('Device not paired')
                } else {
                    setError('Failed to load employees')
                }
            } catch (e) {
                setError('Connection error')
            } finally {
                setLoading(false)
            }
        }

        fetchEmployees()
    }, [stationToken])

    if (loading) {
        return (
            <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-4 text-stone-500 text-sm">
                {error}
            </div>
        )
    }

    if (employees.length === 0) {
        return (
            <div className="text-center py-4 text-stone-500 text-sm">
                No employees found
            </div>
        )
    }

    // Color palette for avatar backgrounds
    const colors = [
        'bg-gradient-to-br from-orange-500 to-amber-600',
        'bg-gradient-to-br from-blue-500 to-indigo-600',
        'bg-gradient-to-br from-emerald-500 to-teal-600',
        'bg-gradient-to-br from-purple-500 to-pink-600',
        'bg-gradient-to-br from-rose-500 to-red-600',
        'bg-gradient-to-br from-cyan-500 to-blue-600',
    ]

    return (
        <div className="w-full">
            <p className="text-center text-stone-400 text-sm mb-4">
                Tap your name to clock in
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-w-2xl mx-auto">
                {employees.map((employee, index) => (
                    <button
                        key={employee.id}
                        onClick={() => onEmployeeSelect(employee)}
                        disabled={isLoading}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl 
                                   bg-stone-800/50 hover:bg-stone-700/70 
                                   border border-stone-700 hover:border-orange-500/50
                                   transition-all duration-200 
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   group"
                    >
                        {/* Avatar */}
                        <div className={`
                            w-14 h-14 rounded-full flex items-center justify-center
                            ${colors[index % colors.length]}
                            text-white font-bold text-lg
                            shadow-lg group-hover:scale-105 transition-transform
                        `}>
                            {employee.avatar ? (
                                <img
                                    src={employee.avatar}
                                    alt={employee.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                employee.initials
                            )}
                        </div>

                        {/* Name */}
                        <span className="text-xs text-stone-300 text-center truncate w-full">
                            {employee.name.split(' ')[0]}
                        </span>

                        {/* Role badge for managers/owners */}
                        {(employee.role === 'MANAGER' || employee.role === 'OWNER') && (
                            <span className="text-[10px] text-orange-400 font-medium">
                                {employee.role === 'OWNER' ? '★' : '◆'}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
