'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, MoreVertical, Shield, User, Mail, Calendar, DollarSign, Key, X, Eye, EyeOff, Hash, AlertTriangle, Trash2, Scissors } from 'lucide-react'
import EmployeeModal from '@/components/employees/EmployeeModal'
import AssignServicesModal from '@/components/employees/AssignServicesModal'
import { useToast } from '@/components/providers/ToastProvider'

export default function EmployeesPage() {
    const toast = useToast()
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
    const [pinModal, setPinModal] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null })
    const [newPin, setNewPin] = useState('')
    const [settingPin, setSettingPin] = useState(false)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: any | null; deleting: boolean }>({ open: false, employee: null, deleting: false })
    const [servicesModal, setServicesModal] = useState<{ open: boolean; employee: any | null }>({ open: false, employee: null })
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Fetch current location from the location toggle API
    const fetchCurrentLocation = async () => {
        try {
            const res = await fetch('/api/employees/current-location')
            if (res.ok) {
                const data = await res.json()
                const newLocationId = data.currentLocation?.id || null
                // Only re-fetch employees if location changed
                if (newLocationId !== currentLocationId) {
                    setCurrentLocationId(newLocationId)
                }
            }
        } catch (error) {
            console.error('Error fetching current location:', error)
        }
    }

    const fetchEmployees = async (locationId?: string | null) => {
        try {
            const url = locationId
                ? `/api/franchise/employees?locationId=${locationId}`
                : '/api/franchise/employees'
            const res = await fetch(url)
            const response = await res.json()
            // Handle both array and paginated response formats
            const employeesArray = Array.isArray(response)
                ? response
                : (response.data || response.employees || [])
            setEmployees(employeesArray)
        } catch (error) {
            console.error('Error fetching employees:', error)
        } finally {
            setLoading(false)
        }
    }

    // Initial load: get current location first, then fetch employees
    useEffect(() => {
        fetchCurrentLocation()
    }, [])

    // Fetch employees when location changes
    useEffect(() => {
        if (currentLocationId !== null) {
            fetchEmployees(currentLocationId)
        } else {
            // If no specific location, fetch all
            fetchEmployees()
        }
    }, [currentLocationId])

    // Poll for location changes every 2 seconds (to detect dropdown changes)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchCurrentLocation()
        }, 2000)
        return () => clearInterval(interval)
    }, [currentLocationId])

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
            let response;
            if (selectedEmployee) {
                // Update
                response = await fetch(`/api/franchise/employees/${selectedEmployee.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
            } else {
                // Create
                response = await fetch('/api/franchise/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
            }

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Employee save failed:', errorData)
                toast.error(errorData.error?.message || 'Failed to save employee')
                throw new Error(errorData.error?.message || 'Failed to save employee')
            }

            toast.success(selectedEmployee ? 'Employee updated successfully!' : 'Employee added successfully!')
            fetchEmployees()
        } catch (error) {
            console.error('Error saving employee:', error)
            throw error
        }
    }

    const handleDeleteEmployee = (employee: any) => {
        setDeleteModal({ open: true, employee, deleting: false })
        setOpenMenuId(null)
    }

    const confirmDelete = async () => {
        if (!deleteModal.employee) return
        setDeleteModal(prev => ({ ...prev, deleting: true }))
        try {
            const res = await fetch(`/api/franchise/employees/${deleteModal.employee.id}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const data = await res.json()
                toast.error(data.error || 'Failed to delete employee')
                setDeleteModal(prev => ({ ...prev, deleting: false }))
                return
            }
            toast.success('Employee deleted successfully!')
            fetchEmployees()
            setDeleteModal({ open: false, employee: null, deleting: false })
        } catch (error) {
            console.error('Error deleting employee:', error)
            toast.error('Failed to delete employee')
            setDeleteModal(prev => ({ ...prev, deleting: false }))
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

    const handleSetPIN = async () => {
        if (!pinModal.employee) return
        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            return
        }
        setSettingPin(true)
        try {
            const res = await fetch(`/api/franchise/employees/${pinModal.employee.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: newPin })
            })
            if (res.ok) {
                setPinModal({ open: false, employee: null })
                setNewPin('')
            } else {
                const data = await res.json()
                console.error(data.error || 'Failed to set PIN')
            }
        } catch (error) {
            console.error('Error setting PIN:', error)
        } finally {
            setSettingPin(false)
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
                                                    setServicesModal({ open: true, employee })
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors flex items-center gap-3"
                                                style={{ color: '#e7e5e4' }}
                                            >
                                                <Scissors className="h-4 w-4 text-pink-400" />
                                                Assign Services
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
                                            <button
                                                onClick={() => {
                                                    setOpenMenuId(null)
                                                    setPinModal({ open: true, employee })
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-800 transition-colors flex items-center gap-3"
                                                style={{ color: '#e7e5e4' }}
                                            >
                                                <Hash className="h-4 w-4 text-emerald-400" />
                                                Set PIN
                                            </button>
                                            <div style={{ borderTop: '1px solid #292524', margin: '4px 0' }} />
                                            <button
                                                onClick={() => handleDeleteEmployee(employee)}
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

            {/* Set PIN Modal */}
            {pinModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#0c0a09', border: '1px solid #292524' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Set PIN</h3>
                            <button
                                onClick={() => {
                                    setPinModal({ open: false, employee: null })
                                    setNewPin('')
                                }}
                                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-stone-400 mb-4">
                            Enter a 4-digit PIN for <span className="text-white font-medium">{pinModal.employee?.name}</span>
                        </p>
                        <p className="text-sm text-stone-500 mb-4">
                            This PIN will be used for quick login at the POS.
                        </p>
                        <div className="relative mb-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="Enter 4-digit PIN"
                                className="w-full px-4 py-4 rounded-xl text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                                style={{ backgroundColor: '#1c1917', border: '1px solid #292524' }}
                                autoFocus
                            />
                        </div>
                        {newPin.length > 0 && newPin.length < 4 && (
                            <p className="text-amber-400 text-sm mb-4">PIN must be 4 digits</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPinModal({ open: false, employee: null })
                                    setNewPin('')
                                }}
                                className="flex-1 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors"
                                style={{ border: '1px solid #292524' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetPIN}
                                disabled={newPin.length !== 4 || settingPin}
                                className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: newPin.length === 4 ? '#059669' : '#44403c' }}
                            >
                                {settingPin ? 'Setting...' : 'Set PIN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ backgroundColor: '#1c1917' }}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete Employee</h3>
                                <p className="text-white/80 text-sm">This action cannot be undone</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-stone-300 mb-6">
                                Are you sure you want to delete <strong className="text-white">{deleteModal.employee?.name}</strong>?
                                All their data will be permanently removed.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal({ open: false, employee: null, deleting: false })}
                                    disabled={deleteModal.deleting}
                                    className="flex-1 px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-colors disabled:opacity-50"
                                    style={{ border: '1px solid #292524' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteModal.deleting}
                                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {deleteModal.deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Services Modal */}
            <AssignServicesModal
                isOpen={servicesModal.open}
                onClose={() => setServicesModal({ open: false, employee: null })}
                employeeId={servicesModal.employee?.id || ''}
                employeeName={servicesModal.employee?.name || ''}
            />
        </div>
    )
}

