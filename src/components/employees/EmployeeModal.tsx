'use client'

import { useState, useEffect } from 'react'
import { X, Shield, Check, User, Mail, Lock } from 'lucide-react'

interface EmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    employee?: any
    onSave: (data: any) => Promise<void>
}

export default function EmployeeModal({ isOpen, onClose, employee, onSave }: EmployeeModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        pin: '',
        permissions: {
            canAddServices: false,
            canAddProducts: false,
            canManageInventory: false,
            canViewReports: false,
            canProcessRefunds: false,
            canManageSchedule: false,
            canManageEmployees: false,
        }
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name,
                email: employee.email,
                password: '', // Don't show password
                pin: '', // Don't show existing hash, but allow reset
                permissions: {
                    canAddServices: employee.canAddServices,
                    canAddProducts: employee.canAddProducts,
                    canManageInventory: employee.canManageInventory,
                    canViewReports: employee.canViewReports,
                    canProcessRefunds: employee.canProcessRefunds,
                    canManageSchedule: employee.canManageSchedule,
                    canManageEmployees: employee.canManageEmployees,
                }
            })
        } else {
            // Reset for new employee
            setFormData({
                name: '',
                email: '',
                password: '',
                pin: '',
                permissions: {
                    canAddServices: false,
                    canAddProducts: false,
                    canManageInventory: false,
                    canViewReports: false,
                    canProcessRefunds: false,
                    canManageSchedule: false,
                    canManageEmployees: false,
                }
            })
        }
    }, [employee, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(formData)
            onClose()
        } catch (error) {
            console.error('Error saving employee:', error)
        } finally {
            setLoading(false)
        }
    }

    const togglePermission = (key: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key as keyof typeof prev.permissions]
            }
        }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {employee ? 'Edit Employee' : 'Add New Employee'}
                    </h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Basic Info */}
                    <div className="space-y-4 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            {!employee && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quick Login PIN (4 digits)</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={formData.pin}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                                            setFormData({ ...formData, pin: val })
                                        }}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest font-mono"
                                        placeholder="0000"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Used for quick access on POS devices</p>
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-purple-600" />
                            Permissions & Access
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { key: 'canAddServices', label: 'Manage Services', desc: 'Create and edit service menu items' },
                                { key: 'canAddProducts', label: 'Manage Products', desc: 'Create and edit retail products' },
                                { key: 'canManageInventory', label: 'Manage Inventory', desc: 'Update stock levels and track inventory' },
                                { key: 'canViewReports', label: 'View Reports', desc: 'Access financial and performance reports' },
                                { key: 'canProcessRefunds', label: 'Process Refunds', desc: 'Issue refunds to customers' },
                                { key: 'canManageSchedule', label: 'Manage Schedule', desc: 'Create and edit staff schedules' },
                                { key: 'canManageEmployees', label: 'Manage Employees', desc: 'Add/edit other employees (Manager Access)' },
                            ].map((perm) => (
                                <div
                                    key={perm.key}
                                    onClick={() => togglePermission(perm.key)}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.permissions[perm.key as keyof typeof formData.permissions]
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-200'
                                        }`}
                                >
                                    <div>
                                        <p className={`font-medium ${formData.permissions[perm.key as keyof typeof formData.permissions]
                                            ? 'text-blue-900'
                                            : 'text-gray-900'
                                            }`}>{perm.label}</p>
                                        <p className="text-sm text-gray-500">{perm.desc}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.permissions[perm.key as keyof typeof formData.permissions]
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-300'
                                        }`}>
                                        {formData.permissions[perm.key as keyof typeof formData.permissions] && (
                                            <Check className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (employee ? 'Save Changes' : 'Create Employee')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
