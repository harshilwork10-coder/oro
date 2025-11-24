'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Megaphone, Target, TrendingUp } from "lucide-react"

export default function MarketingReportPage() {
    // Mock data
    const marketingData = [
        { id: 1, campaign: "Summer Special", spend: 5000, revenue: 25000, roi: 400, cpa: 12.50, conversions: 400 },
        { id: 2, campaign: "New Customer Promo", spend: 3000, revenue: 9000, roi: 200, cpa: 25.00, conversions: 120 },
        { id: 3, campaign: "Loyalty Boost", spend: 1500, revenue: 12000, roi: 700, cpa: 5.00, conversions: 300 },
        { id: 4, campaign: "Local Ads - East", spend: 2000, revenue: 3000, roi: 50, cpa: 45.00, conversions: 44 },
    ]

    return (
        <ReportPageLayout
            title="Marketing ROI"
            description="Analyze the effectiveness of marketing campaigns and customer acquisition costs."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Total ROI</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">326%</span>
                        <span className="text-xs font-medium text-emerald-400">Excellent</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg CPA</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$13.31</span>
                        <span className="text-xs text-stone-500">Cost Per Acquisition</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Total Conversions</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">864</span>
                        <span className="text-xs text-stone-500">This Month</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Campaign Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Campaign Name</th>
                                <th className="px-6 py-3 text-right">Spend</th>
                                <th className="px-6 py-3 text-right">Revenue Generated</th>
                                <th className="px-6 py-3 text-right">ROI %</th>
                                <th className="px-6 py-3 text-right">CPA ($)</th>
                                <th className="px-6 py-3 text-right">Conversions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {marketingData.sort((a, b) => b.roi - a.roi).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.campaign}</td>
                                    <td className="px-6 py-4 text-right">${item.spend.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-stone-100">${item.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.roi >= 300 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.roi >= 100 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.roi}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">${item.cpa.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">{item.conversions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
