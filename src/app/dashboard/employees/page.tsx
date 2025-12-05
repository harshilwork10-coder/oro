'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, MoreVertical, Shield, User, Mail, Calendar, DollarSign } from 'lucide-react'
import EmployeeModal from '@/components/employees/EmployeeModal'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/franchise/employees')
            const data = await res.json()
            if (Array.isArray(data)) {
                setEmployees(data)
            }
        } catch (error) {
            console.error('Error fetching employees:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [])

    const handleSaveEmployee = async (data: any) => {
        try {
            if (selectedEmployee) {
                // Update
                await fetch(`/api/franchise/employees/${selectedEmployee.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
            } else {
                // Create
                await fetch('/api/franchise/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
            }
            fetchEmployees()
        } catch (error) {
            console.error('Error saving employee:', error)
            throw error
        }
    }

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return
        try {
            await fetch(`/api/franchise/employees/${id}`, {
                method: 'DELETE'
            })
            fetchEmployees()
        } catch (error) {
            console.error('Error deleting employee:', error)
        }
    }

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Employee Management</h1>
                    <p className="text-stone-400 mt-1">Manage staff access and permissions</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedEmployee(null)
                        setIsModalOpen(true)
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-900/20 transition-all font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Add Employee
                </button>
            </div>

            {/* Search */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Employees Grid */}
            {loading ? (
                <div className="text-center py-12 text-stone-500">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee) => (
                        <div key={employee.id} className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400 font-bold text-lg border border-blue-500/20">
                                        {employee.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-100 group-hover:text-blue-400 transition-colors">{employee.name}</h3>
                                        <p className="text-sm text-stone-400">{employee.email}</p>
                                    </div>
                                </div>
                                <div className="relative group/menu">
                                    <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-300 transition-colors">
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                    <div className="absolute right-0 mt-2 w-48 bg-stone-900 rounded-xl shadow-xl border border-stone-800 py-1 hidden group-hover/menu:block z-20">
                                        <button
                                            onClick={() => {
                                                setSelectedEmployee(employee)
                                                setIsModalOpen(true)
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
                                        >
                                            Edit Permissions
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEmployee(employee.id)}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            Delete Employee
                                        </button>
                                        <div className="border-t border-stone-800 my-1" />
                                        <button
                                            onClick={() => window.location.href = `/dashboard/employees/${employee.id}/commission`}
                                            className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-stone-800 hover:text-orange-300 transition-colors flex items-center gap-2"
                                        >
                                            <DollarSign className="h-4 w-4" />
                                            Configure Commission
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-2 text-sm text-stone-500">
                                    <Shield className="h-4 w-4 text-indigo-400" />
                                    <span className="font-medium">Active Permissions:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {employee.canAddServices && (
                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20">Services</span>
                                    )}
                                    {employee.canAddProducts && (
                                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg border border-purple-500/20">Products</span>
                                    )}
                                    {employee.canViewReports && (
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/20">Reports</span>
                                    )}
                                    {employee.canManageInventory && (
                                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-lg border border-orange-500/20">Inventory</span>
                                    )}
                                    {/* Show count of other permissions if many */}
                                    {Object.values(employee).filter(v => v === true).length > 4 && (
                                        <span className="px-2 py-1 bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-700">
                                            +{Object.values(employee).filter(v => v === true).length - 4} more
                                        </span>
                                    )}
                                    {/* If no permissions */}
                                    {Object.values(employee).filter(v => v === true).length === 0 && (
                                        <span className="px-2 py-1 bg-stone-800 text-stone-500 text-xs rounded-lg border border-stone-700 italic">
                                            POS Access Only
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                employee={selectedEmployee}
                onSave={handleSaveEmployee}
            />
        </div>
    )
}
