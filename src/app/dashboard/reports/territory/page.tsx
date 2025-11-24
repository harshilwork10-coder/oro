'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { MapPin, Users, Target } from "lucide-react"

export default function TerritoryReportPage() {
    // Mock data
    const territoryData = [
        { id: 1, region: "Downtown Metro", saturation: 85, competitors: 12, opportunity: "LOW", recommended: "NO" },
        { id: 2, region: "West Suburbs", saturation: 45, competitors: 5, opportunity: "HIGH", recommended: "YES" },
        { id: 3, region: "North Hills", saturation: 60, competitors: 8, opportunity: "MEDIUM", recommended: "POSSIBLE" },
        { id: 4, region: "East District", saturation: 30, competitors: 2, opportunity: "VERY HIGH", recommended: "YES" },
        { id: 5, region: "South Side", saturation: 70, competitors: 10, opportunity: "LOW", recommended: "NO" },
    ]

    return (
        <ReportPageLayout
            title="Territory Analysis"
            description="Analyze market saturation and identify high-potential zones for expansion."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Top Opportunity</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">East District</span>
                        <span className="text-sm font-bold text-emerald-400">Very High</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Saturation</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">58%</span>
                        <span className="text-xs text-stone-500">Moderate</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Total Competitors</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">37</span>
                        <span className="text-xs text-stone-500">Tracked in Zones</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Regional Market Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Region</th>
                                <th className="px-6 py-3 text-center">Saturation %</th>
                                <th className="px-6 py-3 text-center">Competitors</th>
                                <th className="px-6 py-3 text-center">Opportunity Level</th>
                                <th className="px-6 py-3 text-center">Recommended</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {territoryData.sort((a, b) => a.saturation - b.saturation).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.region}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="w-full bg-stone-800 rounded-full h-2.5 max-w-[100px] mx-auto">
                                            <div className={`h-2.5 rounded-full ${item.saturation > 70 ? 'bg-red-500' : item.saturation > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${item.saturation}%` }}></div>
                                        </div>
                                        <span className="text-xs mt-1 block">{item.saturation}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{item.competitors}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.opportunity === 'VERY HIGH' || item.opportunity === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.opportunity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.opportunity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-stone-200">{item.recommended}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
