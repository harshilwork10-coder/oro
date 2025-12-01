'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Save, User, Mail, Phone, Building2,
    MapPin, DollarSign, Calendar, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function NewLeadPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        city: '',
        state: '',
        status: 'NEW',
        source: '',
        estimatedValue: '',
        proposedFee: '',
        lastContact: '',
        nextFollowUp: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                router.push('/dashboard/crm/leads')
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create lead')
            }
        } catch (error) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Leads
                </Link>
                <h1 className="text-3xl font-bold text-stone-900">Add New Lead</h1>
                <p className="text-stone-500 mt-1">Add a new franchise prospect to your pipeline</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                {/* Contact Information */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-purple-600" />
                        Contact Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="John Smith"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                    </div>
                </div>

                {/* Business Information */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        Business Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Company Name
                            </label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="Smith Ventures LLC"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="Los Angeles"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                State
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="CA"
                            />
                        </div>
                    </div>
                </div>

                {/* Lead Details */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Lead Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            >
                                <option value="NEW">New</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="QUALIFIED">Qualified</option>
                                <option value="PROPOSAL">Proposal Sent</option>
                                <option value="NEGOTIATION">In Negotiation</option>
                                <option value="CLOSED_WON">Closed Won</option>
                                <option value="CLOSED_LOST">Closed Lost</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Source
                            </label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select source...</option>
                                <option value="WEBSITE">Website</option>
                                <option value="REFERRAL">Referral</option>
                                <option value="EVENT">Event</option>
                                <option value="COLD_CALL">Cold Call</option>
                                <option value="SOCIAL_MEDIA">Social Media</option>
                                <option value="ADVERTISEMENT">Advertisement</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Estimated Value ($)
                            </label>
                            <input
                                type="number"
                                name="estimatedValue"
                                value={formData.estimatedValue}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="50000"
                                min="0"
                                step="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Proposed Fee ($)
                            </label>
                            <input
                                type="number"
                                name="proposedFee"
                                value={formData.proposedFee}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="35000"
                                min="0"
                                step="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Last Contact
                            </label>
                            <input
                                type="date"
                                name="lastContact"
                                value={formData.lastContact}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">
                                Next Follow-Up
                            </label>
                            <input
                                type="date"
                                name="nextFollowUp"
                                value={formData.nextFollowUp}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-6 border-t border-stone-200">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" /> Create Lead
                            </>
                        )}
                    </button>
                    <Link
                        href="/dashboard/crm/leads"
                        className="px-6 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    )
}
