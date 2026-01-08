'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, DollarSign, Clock, TrendingUp, User, ChevronRight } from 'lucide-react'

export default function EmployeeDashboardPage() {
    const { data: session } = useSession()
    const [schedule, setSchedule] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [scheduleRes, statsRes] = await Promise.all([
                    fetch('/api/employee/schedule'),
                    fetch('/api/employee/stats')
                ])

                if (scheduleRes.ok) {
                    setSchedule(await scheduleRes.json())
                }
                if (statsRes.ok) {
                    setStats(await statsRes.json())
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Welcome Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Hello, {session?.user?.name?.split(' ')[0] || 'Employee'}! 👋
                        </h1>
                        <p className="text-gray-500 mt-2">Here's what's happening today.</p>
                    </div>
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {session?.user?.name?.[0]}
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Month Sales"
                            value={`$${stats.totalSales.toFixed(2)}`}
                            icon={DollarSign}
                            color="blue"
                        />
                        <StatCard
                            title="Tips Earned"
                            value={`$${stats.totalTips.toFixed(2)}`}
                            icon={TrendingUp}
                            color="green"
                        />
                        <StatCard
                            title="Hours Worked"
                            value={stats.hoursWorked.toFixed(1)}
                            icon={Clock}
                            color="purple"
                        />
                        <StatCard
                            title="Transactions"
                            value={stats.transactionCount}
                            icon={User}
                            color="orange"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upcoming Schedule */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Upcoming Shifts</h2>
                            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View Calendar</button>
                        </div>

                        <div className="space-y-4">
                            {schedule.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No upcoming shifts scheduled.</p>
                            ) : (
                                schedule.map((shift: any) => (
                                    <div key={shift.id} className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                        <div className="h-12 w-12 bg-white rounded-lg flex flex-col items-center justify-center border border-gray-200 shadow-sm mr-4">
                                            <span className="text-xs font-bold text-gray-500 uppercase">
                                                {new Date(shift.startTime).toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">
                                                {new Date(shift.startTime).getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">
                                                {new Date(shift.startTime).toLocaleDateString('en-US', { weekday: 'long' })} Shift
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {new Date(shift.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} -
                                                    {new Date(shift.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        {shift.notes && (
                                            <div className="hidden md:block text-sm text-gray-400 italic mr-4">
                                                "{shift.notes}"
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <span className="font-medium text-gray-900">Update Profile</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                            </button>
                            {/* Add more actions here later */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}

