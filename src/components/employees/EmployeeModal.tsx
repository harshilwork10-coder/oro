'use client'

import { useState, useEffect } from 'react'
import { X, Shield, Check, User, Mail, Lock, MapPin } from 'lucide-react'

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
        locationId: '',
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
    const [locations, setLocations] = useState<any[]>([])

    useEffect(() => {
        if (isOpen) {
            fetch('/api/locations')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setLocations(data)
                })
                .catch(err => console.error('Error fetching locations:', err))
        }
    }, [isOpen])

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name,
                email: employee.email,
                password: '', // Don't show password
                pin: '', // Don't show existing hash, but allow reset
                locationId: employee.locationId || '', // Include locationId from employee
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
                locationId: '',
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
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <select
                                        required
                                        value={formData.locationId}
                                        onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-gray-900"
                                    >
                                        <option value="">Select a location...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
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
                                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest font-mono text-gray-900"
                                        placeholder="0000"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Used for quick access on POS devices</p>
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-600" />
                            Permissions & Access
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'canAddServices', label: 'Manage Services' },
                                { key: 'canAddProducts', label: 'Manage Products' },
                                { key: 'canManageInventory', label: 'Manage Inventory' },
                                { key: 'canViewReports', label: 'View Reports' },
                                { key: 'canProcessRefunds', label: 'Process Refunds' },
                                { key: 'canManageSchedule', label: 'Manage Schedule' },
                                { key: 'canManageEmployees', label: 'Manage Employees' },
                            ].map((perm) => (
                                <label
                                    key={perm.key}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${formData.permissions[perm.key as keyof typeof formData.permissions]
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions[perm.key as keyof typeof formData.permissions]}
                                        onChange={() => togglePermission(perm.key)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">{perm.label}</span>
                                </label>
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
