'use client'

import { useState } from 'react'
import { Users, Heart, Mail, Phone, Plus, Search } from 'lucide-react'

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showEnrollModal, setShowEnrollModal] = useState(false)
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [newCustomer, setNewCustomer] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        enrollInLoyalty: false
    })

    const customers = [
        { id: 1, name: 'Sarah Jenkins', email: 'sarah@example.com', phone: '(555) 123-4567', visits: 12, lastVisit: '2 days ago', loyaltyMember: true, points: 850 },
        { id: 2, name: 'Michael Chen', email: 'michael@example.com', phone: '(555) 234-5678', visits: 8, lastVisit: '1 week ago', loyaltyMember: true, points: 1200 },
        { id: 3, name: 'Emma Wilson', email: 'emma@example.com', phone: '(555) 345-6789', visits: 15, lastVisit: 'Yesterday', loyaltyMember: false, points: 0 },
        { id: 4, name: 'David Martinez', email: 'david@example.com', phone: '(555) 456-7890', visits: 5, lastVisit: '3 days ago', loyaltyMember: false, points: 0 },
        { id: 5, name: 'Lisa Anderson', email: 'lisa@example.com', phone: '(555) 567-8901', visits: 20, lastVisit: 'Today', loyaltyMember: true, points: 2450 }
    ]

    const handleEnrollInLoyalty = (customer: any) => {
        setSelectedCustomer(customer)
        setShowEnrollModal(true)
    }

    const confirmEnrollment = () => {
        alert(`${selectedCustomer.name} enrolled in loyalty program!`)
        setShowEnrollModal(false)
        setSelectedCustomer(null)
    }

    const handleAddCustomer = () => {
        if (!newCustomer.firstName || !newCustomer.lastName) {
            alert('Please enter first and last name')
            return
        }
        alert(`Customer ${newCustomer.firstName} ${newCustomer.lastName} added successfully!`)
        setShowAddCustomerModal(false)
        setNewCustomer({ firstName: '', lastName: '', email: '', phone: '', enrollInLoyalty: false })
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
    )

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-500" />
                        Customer Management
                    </h1>
                    <p className="text-stone-400 mt-2">{customers.length} total customers</p>
                </div>
                <button
                    onClick={() => setShowAddCustomerModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="relative">
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

            {/* Customer List */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Contact</th>
                                <th className="px-6 py-3 text-right">Visits</th>
                                <th className="px-6 py-3 text-right">Last Visit</th>
                                <th className="px-6 py-3 text-center">Loyalty</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-stone-200">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs">
                                                <Mail className="h-3 w-3" />
                                                <span>{customer.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Phone className="h-3 w-3" />
                                                <span>{customer.phone}</span>
                                            </div>
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
                                    <td className="px-6 py-4 text-right">
                                        {!customer.loyaltyMember && (
                                            <button
                                                onClick={() => handleEnrollInLoyalty(customer)}
                                                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                <Heart className="h-3 w-3" />
                                                Enroll in Loyalty
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enrollment Modal */}
            {showEnrollModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-6 rounded-xl max-w-md w-full border border-stone-700">
                        <h3 className="text-xl font-bold text-stone-100 mb-4 flex items-center gap-2">
                            <Heart className="h-6 w-6 text-pink-500" />
                            Enroll in Loyalty Program
                        </h3>
                        <p className="text-stone-400 mb-6">
                            Enroll <span className="text-stone-100 font-medium">{selectedCustomer.name}</span> in the loyalty rewards program?
                        </p>
                        <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20 mb-6">
                            <p className="text-sm text-pink-300">
                                ✨ Customer will start earning points on every purchase
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEnrollModal(false)}
                                className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmEnrollment}
                                className="flex-1 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Enroll Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            {showAddCustomerModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-6 rounded-xl max-w-md w-full border border-stone-700">
                        <h3 className="text-xl font-bold text-stone-100 mb-4 flex items-center gap-2">
                            <Plus className="h-6 w-6 text-blue-500" />
                            Add New Customer
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        value={newCustomer.firstName}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        value={newCustomer.lastName}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enrollLoyalty"
                                    checked={newCustomer.enrollInLoyalty}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, enrollInLoyalty: e.target.checked })}
                                    className="w-4 h-4 bg-stone-900 border-stone-700 rounded text-pink-600 focus:ring-pink-500"
                                />
                                <label htmlFor="enrollLoyalty" className="text-sm text-stone-300">
                                    Enroll in loyalty program
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddCustomerModal(false)
                                    setNewCustomer({ firstName: '', lastName: '', email: '', phone: '', enrollInLoyalty: false })
                                }}
                                className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCustomer}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Add Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
