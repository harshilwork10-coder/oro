'use client'

import { useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import type { LiveStats } from './types'

interface PulseReportsTabProps {
    stats: LiveStats
}

export default function PulseReportsTab({ stats }: PulseReportsTabProps) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))

    return (
        <>
            <div className="text-center mb-4">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 text-orange-500" />
                <h2 className="text-lg font-bold text-white">Download Reports</h2>
            </div>

            {/* Date Filters */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                <p className="text-gray-400 text-xs uppercase mb-3">📅 Select Report Date</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Daily / Weekly</label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Month</label>
                        <input
                            type="month"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                            max={new Date().toISOString().slice(0, 7)}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Report Options */}
            <div className="space-y-2">
                {/* Daily Report */}
                <button
                    onClick={() => window.open(`/api/reports/daily?date=${reportDate}&print=true`, '_blank')}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <span className="text-lg">📊</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Daily Report</p>
                            <p className="text-gray-400 text-xs">{new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                </button>

                {/* Weekly Report */}
                <button
                    onClick={() => window.open(`/api/reports/weekly?endDate=${reportDate}&print=true`, '_blank')}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <span className="text-lg">📅</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Weekly Report</p>
                            <p className="text-gray-400 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                </button>

                {/* Monthly Report */}
                <button
                    onClick={() => window.open(`/api/reports/monthly?month=${reportMonth}&print=true`, '_blank')}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-lg">📈</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Monthly Report</p>
                            <p className="text-gray-400 text-xs">{new Date(reportMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                </button>

                {/* Shift Reports */}
                <button
                    onClick={() => window.open(`/api/reports/shifts?endDate=${reportDate}&print=true`, '_blank')}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <span className="text-lg">👤</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Shift Reports</p>
                            <p className="text-gray-400 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                </button>

                {/* Lottery Report */}
                <button
                    onClick={() => window.open(`/api/reports/lottery?endDate=${reportDate}&print=true`, '_blank')}
                    className="w-full bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-lg">🎰</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Lottery Report</p>
                            <p className="text-purple-300 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-purple-400" />
                </button>

                {/* Inventory Report */}
                <button
                    onClick={() => window.open('/api/reports/inventory?print=true', '_blank')}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <span className="text-lg">📦</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">Inventory Report</p>
                            <p className="text-gray-400 text-xs">Current stock levels</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                </button>

                {/* CPA Monthly Tax Report */}
                <button
                    onClick={() => window.open(`/api/reports/cpa-monthly?month=${reportMonth}&print=true`, '_blank')}
                    className="w-full bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-lg">🧾</span>
                        </div>
                        <div className="text-left">
                            <p className="text-white font-medium text-sm">CPA Monthly Report</p>
                            <p className="text-emerald-300 text-xs">{new Date(reportMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-400" />
                </button>
            </div>

            {/* Quick Stats Summary */}
            <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-xs uppercase mb-2">Quick Summary</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-xl font-bold text-green-400">${stats.todaySales.toFixed(2)}</p>
                        <p className="text-gray-500 text-xs">Today</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-blue-400">${stats.weekSales.toFixed(2)}</p>
                        <p className="text-gray-500 text-xs">This Week</p>
                    </div>
                </div>
            </div>
        </>
    )
}
