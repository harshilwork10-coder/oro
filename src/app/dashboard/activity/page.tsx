'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState } from 'react'
import {
    Building2,
    MapPin,
    Users,
    FileText,
    DollarSign,
    Shield,
    Clock,
    Search,
    Filter,
    Download
} from 'lucide-react'

type ActivityEvent = {
    id: string
    type: 'franchise' | 'location' | 'employee' | 'financial' | 'compliance' | 'document'
    action: string
    description: string
    user: string
    timestamp: string
    details?: string
}

export default function ActivityTimelinePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<string>('all')

    if (status === 'loading') {
        <div className="flex items-center justify-center min-h-screen bg-stone-950">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
    }

    // Mock activity data
    const activities: ActivityEvent[] = [
        {
            id: '1',
            type: 'franchise',
            action: 'Franchise Added',
            description: 'Downtown Franchise created',
            user: 'System Provider',
            timestamp: '2 hours ago',
            details: 'New franchise agreement signed, initial setup completed'
        },
        {
            id: '2',
            type: 'location',
            action: 'Location Opened',
            description: 'Westside Location #47 opened',
            user: 'John Doe',
            timestamp: '4 hours ago',
            details: 'Grand opening completed, initial inventory stocked'
        },
        {
            id: '3',
            type: 'employee',
            action: 'Employees Onboarded',
            description: '5 new employees added to Airport Location',
            user: 'Jane Smith',
            timestamp: '6 hours ago',
            details: 'Training scheduled for next week'
        },
        {
            id: '4',
            type: 'financial',
            action: 'Invoice Generated',
            description: 'Monthly invoice sent to Downtown Franchise',
            user: 'System',
            timestamp: '8 hours ago',
            details: 'Amount: $2,450 - Due: Dec 15, 2024'
        },
        {
            id: '5',
            type: 'compliance',
            action: 'Compliance Review Completed',
            description: 'Quarterly review passed for 3 locations',
            user: 'Compliance Team',
            timestamp: '1 day ago',
            details: 'All health and safety standards met'
        },
        {
            id: '6',
            type: 'document',
            action: 'Document Approved',
            description: 'Franchise Agreement v2.1 approved',
            user: 'Legal Team',
            timestamp: '1 day ago',
            details: 'Updated terms and conditions'
        },
        {
            id: '7',
            type: 'location',
            action: 'Location Updated',
            description: 'Operating hours changed for Suburban Location',
            user: 'Manager',
            timestamp: '2 days ago',
            details: 'Extended hours: Now open until 10 PM'
        },
        {
            id: '8',
            type: 'employee',
            action: 'Employee Promoted',
            description: 'Sarah Johnson promoted to Manager',
            user: 'HR Department',
            timestamp: '2 days ago',
            details: 'Effective immediately at Downtown Location'
        },
    ]

    const getIcon = (type: string) => {
        switch (type) {
            case 'franchise': return Building2
            case 'location': return MapPin
            case 'employee': return Users
            case 'financial': return DollarSign
            case 'compliance': return Shield
            case 'document': return FileText
            default: return Clock
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'franchise': return { bg: 'bg-blue-500/20', icon: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
            case 'location': return { bg: 'bg-emerald-500/20', icon: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
            case 'employee': return { bg: 'bg-purple-500/20', icon: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
            case 'financial': return { bg: 'bg-amber-500/20', icon: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
            case 'compliance': return { bg: 'bg-red-500/20', icon: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-400 border-red-500/30' }
            case 'document': return { bg: 'bg-indigo-500/20', icon: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' }
            default: return { bg: 'bg-stone-800', icon: 'bg-stone-600', text: 'text-stone-400', border: 'border-stone-700', badge: 'bg-stone-700 text-stone-400 border-stone-600' }
        }
    }

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.action.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filterType === 'all' || activity.type === filterType
        return matchesSearch && matchesFilter
    })

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Activity Timeline</h1>
                    <p className="text-stone-400 mt-1">Complete audit trail of all system events</p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Log
                </button>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Filter by Type */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500 pointer-events-none" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                        >
                            <option value="all">All Types</option>
                            <option value="franchise">Franchises</option>
                            <option value="location">Locations</option>
                            <option value="employee">Employees</option>
                            <option value="financial">Financial</option>
                            <option value="compliance">Compliance</option>
                            <option value="document">Documents</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-stone-800"></div>

                {/* Events */}
                <div className="space-y-6">
                    {filteredActivities.map((activity, index) => {
                        const Icon = getIcon(activity.type)
                        const colors = getColor(activity.type)

                        return (
                            <div key={activity.id} className="relative pl-20">
                                {/* Icon */}
                                <div className={`absolute left-0 h-16 w-16 ${colors.icon} rounded-xl flex items-center justify-center shadow-lg`}>
                                    <Icon className="h-8 w-8 text-white" />
                                </div>

                                {/* Content Card */}
                                <div className="glass-panel p-6 rounded-2xl hover:border-orange-500/30 transition-all">
                                    <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-lg font-semibold text-stone-100">{activity.action}</h3>
                                                <span className={`px-3 py-1 ${colors.badge} text-xs font-medium rounded-full border`}>
                                                    {activity.type}
                                                </span>
                                            </div>
                                            <p className="text-stone-300">{activity.description}</p>
                                            {activity.details && (
                                                <p className="text-sm text-stone-500 mt-2">{activity.details}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-800">
                                        <div className="flex items-center gap-2 text-sm text-stone-400">
                                            <Users className="h-4 w-4" />
                                            {activity.user}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-stone-400">
                                            <Clock className="h-4 w-4" />
                                            {activity.timestamp}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* No Results */}
                {filteredActivities.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-stone-500">No activities found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* Load More */}
            {filteredActivities.length > 0 && (
                <div className="text-center">
                    <button className="px-6 py-2 bg-stone-800 text-stone-300 rounded-lg border border-stone-700 hover:bg-stone-700 hover:border-orange-500/30 transition-all">
                        Load More Activities
                    </button>
                </div>
            )}
        </div>
    )
}
