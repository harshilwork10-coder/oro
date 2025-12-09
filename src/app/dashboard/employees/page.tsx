'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, MoreVertical, Shield, User, Mail, Calendar, DollarSign, Key, X, Eye, EyeOff } from 'lucide-react'
import EmployeeModal from '@/components/employees/EmployeeModal'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [passwordModal, setPasswordModal] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null })
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [resetting, setResetting] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
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

    const handleResetPassword = async () => {
        if (!passwordModal.employee) return
        if (newPassword.length < 8) {
            return
        }
        setResetting(true)
        try {
            const res = await fetch(`/api/franchise/employees/${passwordModal.employee.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            })
            if (res.ok) {
                setPasswordModal({ open: false, employee: null })
                setNewPassword('')
            } else {
                const data = await res.json()
                console.error(data.error || 'Failed to reset password')
            }
        } catch (error) {
            console.error('Error resetting password:', error)
        } finally {
            setResetting(false)
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
                        <div key={employee.id} className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-all group relative">
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
                                <div className="relative" ref={openMenuId === employee.id ? menuRef : null}>
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}
                                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-stone-300 transition-colors"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>
                                    {openMenuId === employee.id && (
                                        <div
                                            className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl py-1.5 z-[100] overflow-hidden"
                                            style={{ backgroundColor: '#0c0a09', border: '1px solid #292524' }}
                                        >
                                            <button
                                                onClick={() => {
                                                    setSelectedEmployee(employee)
                                                    setIsModalOpen(true)
                                                    setOpenMenuId(null)
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors flex items-center gap-3"
                                                style={{ color: '#e7e5e4' }}
                                            >
                                                <Shield className="h-4 w-4 text-blue-400" />
                                                Edit Permissions
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOpenMenuId(null)
                                                    window.location.href = `/dashboard/employees/${employee.id}/commission`
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors flex items-center gap-3"
                                                style={{ color: '#e7e5e4' }}
                                            >
                                                <DollarSign className="h-4 w-4 text-orange-400" />
                                                Configure Commission
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOpenMenuId(null)
                                                    setPasswordModal({ open: true, employee })
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors flex items-center gap-3"
                                                style={{ color: '#e7e5e4' }}
                                            >
                                                <Key className="h-4 w-4 text-amber-400" />
                                                Reset Password
                                            </button>
                                            <div style={{ borderTop: '1px solid #292524', margin: '4px 0' }} />
                                            <button
                                                onClick={() => {
                                                    handleDeleteEmployee(employee.id)
                                                    setOpenMenuId(null)
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                                style={{ color: '#f87171' }}
                                            >
                                                <User className="h-4 w-4" />
                                                Delete Employee
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
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

            {/* Password Reset Modal */}
            {passwordModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#0c0a09', border: '1px solid #292524' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Reset Password</h3>
                            <button
                                onClick={() => {
                                    setPasswordModal({ open: false, employee: null })
                                    setNewPassword('')
                                }}
                                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-stone-400 mb-4">
                            Enter a new password for <span className="text-white font-medium">{passwordModal.employee?.name}</span>
                        </p>
                        <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-red-400 text-sm mb-4">Password must be at least 8 characters</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPasswordModal({ open: false, employee: null })
                                    setNewPassword('')
                                }}
                                className="flex-1 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors"
                                style={{ border: '1px solid #292524' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={newPassword.length < 8 || resetting}
                                className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: newPassword.length >= 8 ? '#ea580c' : '#44403c' }}
                            >
                                {resetting ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
