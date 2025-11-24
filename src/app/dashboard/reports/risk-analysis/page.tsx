'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { AlertTriangle, TrendingDown, DollarSign, ShieldAlert, Users } from "lucide-react"

export default function RiskAnalysisPage() {
    // Mock data
    const riskData = [
        { id: 1, location: "Aura Uptown", riskScore: 78, riskLevel: "HIGH", factors: ["Declining Sales (-5.7%)", "Low Compliance (68%)"], revenue: 33000, margin: 2.1 },
        { id: 2, location: "Aura Westside", riskScore: 45, riskLevel: "MEDIUM", factors: ["Staff Turnover High", "Customer Complaints"], revenue: 38500, margin: 4.5 },
        { id: 3, location: "Aura East", riskScore: 32, riskLevel: "MEDIUM", factors: ["Flat Growth"], revenue: 29800, margin: 5.2 },
        { id: 4, location: "Aura Downtown", riskScore: 12, riskLevel: "LOW", factors: [], revenue: 45000, margin: 12.4 },
        { id: 5, location: "Aura South", riskScore: 8, riskLevel: "LOW", factors: [], revenue: 41200, margin: 14.1 },
        { id: 6, location: "Aura North Hills", riskScore: 15, riskLevel: "LOW", factors: [], revenue: 52100, margin: 11.8 },
    ]

    return (
        <ReportPageLayout
            title="Location Risk Analysis"
            description="AI-powered risk assessment predicting potential location failures before they happen."
        >
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-amber-400">1 Location Requires Immediate Attention</h3>
                    <p className="text-sm text-stone-400 mt-1">Aura Uptown has triggered a high-risk alert due to declining sales and compliance issues.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* High Risk Locations */}
                <div className="glass-panel rounded-xl p-6 border-t-4 border-red-500">
                    <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                        High Risk Locations (Score 60+)
                    </h3>
                    <div className="space-y-4">
                        {riskData.filter(r => r.riskLevel === 'HIGH').map(location => (
                            <div key={location.id} className="bg-stone-900/50 p-4 rounded-lg border border-red-500/30">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-stone-100">{location.location}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-bold">
                                                Risk Score: {location.riskScore}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors">
                                        Intervene
                                    </button>
                                </div>
                                <div className="space-y-1 mt-3">
                                    <p className="text-xs text-stone-500 uppercase font-bold">Risk Factors:</p>
                                    {location.factors.map((factor, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-stone-300">
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                            {factor}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Watch List */}
                <div className="glass-panel rounded-xl p-6 border-t-4 border-amber-500">
                    <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Watch List (Score 30-59)
                    </h3>
                    <div className="space-y-4">
                        {riskData.filter(r => r.riskLevel === 'MEDIUM').map(location => (
                            <div key={location.id} className="bg-stone-900/50 p-4 rounded-lg border border-amber-500/20">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-stone-100">{location.location}</h4>
                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded font-bold">
                                        Score: {location.riskScore}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-stone-400">Margin: <span className="text-stone-200">{location.margin}%</span></div>
                                    <div className="text-stone-400">Revenue: <span className="text-stone-200">${location.revenue.toLocaleString()}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* All Locations Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h3 className="font-semibold text-stone-100">Full Risk Assessment</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-center">Risk Score</th>
                                <th className="px-6 py-3">Risk Level</th>
                                <th className="px-6 py-3">Primary Factors</th>
                                <th className="px-6 py-3 text-right">Profit Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {riskData.sort((a, b) => b.riskScore - a.riskScore).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs border
                                            ${item.riskScore >= 60 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                                              item.riskScore >= 30 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 
                                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'}">
                                            {item.riskScore}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded
                                            ${item.riskLevel === 'HIGH' ? 'text-red-400 bg-red-500/10' :
                                                item.riskLevel === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10' :
                                                    'text-emerald-400 bg-emerald-500/10'}`}>
                                            {item.riskLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-stone-300">
                                        {item.factors.length > 0 ? item.factors.join(", ") : "None"}
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.margin}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
