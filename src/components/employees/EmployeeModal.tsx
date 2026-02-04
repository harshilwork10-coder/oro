'use client'

import { useState, useEffect } from 'react'
import { X, Shield, Check, User, Mail, Lock, MapPin, DollarSign, Armchair, Clock, Percent, Phone } from 'lucide-react'

interface EmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    employee?: any
    onSave: (data: any) => Promise<void>
    vertical?: 'SALON' | 'RETAIL' | 'RESTAURANT' | string
}

type CompensationType = 'CHAIR_RENTAL' | 'HOURLY' | 'SALARY' | 'COMMISSION' | ''

export default function EmployeeModal({ isOpen, onClose, employee, onSave, vertical = 'RETAIL' }: EmployeeModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        pin: '',
        locationId: '',
        // Compensation fields
        compensationType: '' as CompensationType,
        chairRentAmount: '',
        chairRentPeriod: 'MONTHLY',
        assignedResourceId: '',
        commissionSplit: '70',
        hourlyRate: '',
        salaryAmount: '',
        salaryPeriod: 'MONTHLY',
        requiresTimeClock: false,
        canSetOwnPrices: false,
        // Permissions
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
    const [resources, setResources] = useState<any[]>([])
    const [errors, setErrors] = useState<{ phone?: string; pin?: string }>({})

    // Fetch locations
    useEffect(() => {
        if (isOpen) {
            fetch('/api/locations')
                .then(res => res.json())
                .then(response => {
                    const locationsArray = Array.isArray(response)
                        ? response
                        : (response.data || response.locations || [])
                    setLocations(locationsArray)
                })
                .catch(err => console.error('Error fetching locations:', err))
        }
    }, [isOpen])

    // Fetch resources when location changes (for chair selection)
    useEffect(() => {
        if (formData.locationId && formData.compensationType === 'CHAIR_RENTAL') {
            fetch(`/api/resources?type=CHAIR&locationId=${formData.locationId}`)
                .then(res => res.json())
                .then(data => {
                    const resourcesArray = Array.isArray(data) ? data : (data.data || [])
                    setResources(resourcesArray)
                })
                .catch(err => console.error('Error fetching resources:', err))
        }
    }, [formData.locationId, formData.compensationType])

    useEffect(() => {
        if (employee) {
            // Get compensation from nested compensationPlans array (get first/most recent)
            const comp = employee.compensationPlans?.[0] || employee.compensationPlan || {}
            setFormData({
                name: employee.name || '',
                email: employee.email || '',
                phone: employee.phone || '',
                password: '',
                pin: '',
                locationId: employee.locationId || '',
                // Compensation from nested compensationPlan
                compensationType: comp.compensationType || employee.compensationType || '',
                chairRentAmount: comp.chairRentAmount || employee.chairRentAmount || '',
                chairRentPeriod: comp.chairRentPeriod || employee.chairRentPeriod || 'MONTHLY',
                assignedResourceId: comp.assignedResourceId || employee.assignedResourceId || '',
                commissionSplit: comp.commissionSplit || employee.commissionSplit || '70',
                hourlyRate: comp.hourlyRate || employee.hourlyRate || '',
                salaryAmount: comp.salaryAmount || employee.salaryAmount || '',
                salaryPeriod: comp.salaryPeriod || employee.salaryPeriod || 'MONTHLY',
                requiresTimeClock: employee.requiresTimeClock || false,
                canSetOwnPrices: employee.canSetOwnPrices || false,
                permissions: {
                    canAddServices: employee.canAddServices || false,
                    canAddProducts: employee.canAddProducts || false,
                    canManageInventory: employee.canManageInventory || false,
                    canViewReports: employee.canViewReports || false,
                    canProcessRefunds: employee.canProcessRefunds || false,
                    canManageSchedule: employee.canManageSchedule || false,
                    canManageEmployees: employee.canManageEmployees || false,
                }
            })
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                pin: '',
                locationId: '',
                compensationType: '',
                chairRentAmount: '',
                chairRentPeriod: 'MONTHLY',
                assignedResourceId: '',
                commissionSplit: '70',
                hourlyRate: '',
                salaryAmount: '',
                salaryPeriod: 'MONTHLY',
                requiresTimeClock: false,
                canSetOwnPrices: false,
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
        setErrors({})

        // Validation
        const newErrors: { phone?: string; pin?: string } = {}

        // Phone validation (10 digits required)
        const phoneDigits = formData.phone?.replace(/\D/g, '') || ''
        if (!phoneDigits || phoneDigits.length < 10) {
            newErrors.phone = 'Valid 10-digit phone number required'
        }

        // PIN validation (4 digits required for new employees)
        if (!employee) {
            const pinDigits = formData.pin?.replace(/\D/g, '') || ''
            if (!pinDigits || pinDigits.length !== 4) {
                newErrors.pin = '4-digit PIN required'
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

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

    // Set default time clock and price control based on compensation type
    const handleCompTypeChange = (type: CompensationType) => {
        setFormData(prev => ({
            ...prev,
            compensationType: type,
            requiresTimeClock: type === 'HOURLY', // Default hourly to require time clock
            canSetOwnPrices: type === 'CHAIR_RENTAL' // Default chair rental can set own prices
        }))
    }

    // Generate summary text
    const getSummaryText = () => {
        if (!formData.compensationType) return null

        switch (formData.compensationType) {
            case 'CHAIR_RENTAL':
                const chair = resources.find(r => r.id === formData.assignedResourceId)
                return `Chair Rental - $${formData.chairRentAmount || '0'}/${formData.chairRentPeriod === 'WEEKLY' ? 'week' : 'month'}${chair ? ` - ${chair.name}` : ''}`
            case 'COMMISSION':
                return `Commission - ${formData.commissionSplit}% / ${100 - parseInt(formData.commissionSplit || '0')}% split`
            case 'HOURLY':
                return `Hourly - $${formData.hourlyRate || '0'}/hr`
            case 'SALARY':
                return `Salary - $${formData.salaryAmount || '0'}/${formData.salaryPeriod === 'WEEKLY' ? 'week' : formData.salaryPeriod === 'BIWEEKLY' ? 'bi-weekly' : 'month'}`
            default:
                return null
        }
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
                    <div className="space-y-4 mb-6">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => {
                                            // Auto-format phone number
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                                            let formatted = digits
                                            if (digits.length >= 6) {
                                                formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
                                            } else if (digits.length >= 3) {
                                                formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
                                            }
                                            setFormData({ ...formData, phone: formatted })
                                            setErrors(prev => ({ ...prev, phone: undefined }))
                                        }}
                                        className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                {errors.phone ? (
                                    <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">Used for PIN login on employee app</p>
                                )}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quick Login PIN {!employee && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        required={!employee}
                                        value={formData.pin}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                                            setFormData({ ...formData, pin: val })
                                            setErrors(prev => ({ ...prev, pin: undefined }))
                                        }}
                                        className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest font-mono text-gray-900 ${errors.pin ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        placeholder="0000"
                                    />
                                </div>
                                {errors.pin ? (
                                    <p className="text-xs text-red-600 mt-1">{errors.pin}</p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">{!employee ? '4-digit PIN required for login' : 'Leave blank to keep current PIN'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Compensation Type */}
                    <div className="space-y-4 mb-6 border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Compensation Type
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                // Salon-specific compensation types
                                ...(vertical === 'SALON' ? [
                                    { type: 'CHAIR_RENTAL', label: 'Chair Rental', icon: Armchair, color: 'blue' },
                                    { type: 'COMMISSION', label: 'Commission', icon: Percent, color: 'purple' },
                                ] : []),
                                // Universal compensation types (all verticals)
                                { type: 'HOURLY', label: 'Hourly', icon: Clock, color: 'orange' },
                                { type: 'SALARY', label: 'Salary', icon: DollarSign, color: 'green' },
                            ].map(({ type, label, icon: Icon, color }) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleCompTypeChange(type as CompensationType)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${formData.compensationType === type
                                        ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Conditional Fields */}
                        {formData.compensationType === 'CHAIR_RENTAL' && (
                            <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount ($)</label>
                                        <input
                                            type="number"
                                            value={formData.chairRentAmount}
                                            onChange={e => setFormData({ ...formData, chairRentAmount: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                            placeholder="500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                                        <select
                                            value={formData.chairRentPeriod}
                                            onChange={e => setFormData({ ...formData, chairRentPeriod: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        >
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Chair/Station</label>
                                    <select
                                        value={formData.assignedResourceId}
                                        onChange={e => setFormData({ ...formData, assignedResourceId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    >
                                        <option value="">No fixed chair (first available)</option>
                                        {resources.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-blue-600">💡 Chair renters can set their own prices for services</p>
                            </div>
                        )}

                        {formData.compensationType === 'COMMISSION' && (
                            <div className="bg-purple-50 p-4 rounded-xl space-y-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Split</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="range"
                                            min="30"
                                            max="95"
                                            step="1"
                                            value={formData.commissionSplit}
                                            onChange={e => setFormData({ ...formData, commissionSplit: e.target.value })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min="30"
                                            max="95"
                                            value={formData.commissionSplit}
                                            onChange={e => {
                                                const val = Math.min(95, Math.max(30, parseInt(e.target.value) || 70))
                                                setFormData({ ...formData, commissionSplit: val.toString() })
                                            }}
                                            className="w-14 px-2 py-1 text-center border border-gray-300 rounded-lg font-bold text-purple-700"
                                        />
                                        <span className="text-gray-500">/</span>
                                        <span className="text-lg font-bold text-gray-600 w-10">{100 - parseInt(formData.commissionSplit)}%</span>
                                    </div>
                                </div>
                                <p className="text-xs text-purple-600">
                                    Employee gets {formData.commissionSplit}% • Owner keeps {100 - parseInt(formData.commissionSplit)}%
                                </p>
                            </div>
                        )}

                        {formData.compensationType === 'HOURLY' && (
                            <div className="bg-orange-50 p-4 rounded-xl">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Hourly Rate ($) <span className="text-gray-400 font-normal">- optional</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.hourlyRate}
                                    onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                                    placeholder=""
                                />
                            </div>
                        )}

                        {formData.compensationType === 'SALARY' && (
                            <div className="bg-green-50 p-4 rounded-xl space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Salary Amount ($) <span className="text-gray-400 font-normal">- optional</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.salaryAmount}
                                            onChange={e => setFormData({ ...formData, salaryAmount: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period</label>
                                        <select
                                            value={formData.salaryPeriod}
                                            onChange={e => setFormData({ ...formData, salaryPeriod: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                                        >
                                            <option value="WEEKLY">Weekly</option>
                                            <option value="BIWEEKLY">Bi-Weekly</option>
                                            <option value="MONTHLY">Monthly</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Time Clock Toggle */}
                        {formData.compensationType && (
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.requiresTimeClock}
                                    onChange={e => setFormData({ ...formData, requiresTimeClock: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">Requires Clock In/Out</span>
                                    <p className="text-xs text-gray-500">Track attendance and work hours</p>
                                </div>
                            </label>
                        )}

                        {/* Price Control Toggle */}
                        {formData.compensationType && (
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.canSetOwnPrices}
                                    onChange={e => setFormData({ ...formData, canSetOwnPrices: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">Can Set Own Prices</span>
                                    <p className="text-xs text-gray-500">Employee can customize service prices</p>
                                </div>
                            </label>
                        )}

                        {/* Summary */}
                        {getSummaryText() && (
                            <div className="bg-gray-900 text-white p-3 rounded-xl text-center">
                                <span className="text-sm font-medium">{getSummaryText()}</span>
                            </div>
                        )}
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3 border-t pt-6">
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
