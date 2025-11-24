'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Smile, MessageSquare, Star } from "lucide-react"

export default function NPSReportPage() {
    // Mock data
    const npsData = [
        { id: 1, location: "Aura Downtown", nps: 72, csat: 4.8, reviews: 145, complaints: 2 },
        { id: 2, location: "Aura Westside", nps: 65, csat: 4.5, reviews: 98, complaints: 5 },
        { id: 3, location: "Aura North Hills", nps: 78, csat: 4.9, reviews: 160, complaints: 1 },
        { id: 4, location: "Aura East", nps: 45, csat: 3.8, reviews: 65, complaints: 12 },
        { id: 5, location: "Aura South", nps: 70, csat: 4.7, reviews: 110, complaints: 3 },
    ]

    return (
        <ReportPageLayout
            title="Customer Satisfaction (NPS)"
            description="Track Net Promoter Scores, customer satisfaction ratings, and feedback trends."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Network NPS</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">68</span>
                        <span className="text-xs font-medium text-emerald-400">Excellent</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg CSAT Score</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">4.6/5.0</span>
                        <span className="text-xs text-stone-500">Based on 578 reviews</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Open Complaints</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">23</span>
                        <span className="text-xs font-medium text-red-400">Needs Resolution</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Customer Sentiment by Location</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-center">NPS Score</th>
                                <th className="px-6 py-3 text-center">CSAT (1-5)</th>
                                <th className="px-6 py-3 text-right">Total Reviews</th>
                                <th className="px-6 py-3 text-right">Complaints</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {npsData.sort((a, b) => b.nps - a.nps).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs border
                                            ${item.nps >= 70 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                                                item.nps >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                                                    'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                                            {item.nps}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-stone-200">{item.csat}</td>
                                    <td className="px-6 py-4 text-right">{item.reviews}</td>
                                    <td className={`px-6 py-4 text-right ${item.complaints > 5 ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
                                        {item.complaints}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
