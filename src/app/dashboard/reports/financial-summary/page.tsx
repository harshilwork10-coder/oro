'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign, TrendingUp, Wallet, CreditCard } from "lucide-react"

export default function FinancialSummaryPage() {
    return (
        <ReportPageLayout
            title="Network Financial Summary"
            description="Consolidated financial health overview of the entire franchise network."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Total Network Revenue</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$1.2M</span>
                        <span className="text-xs font-medium text-emerald-400">+12% YTD</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Total EBITDA</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$240K</span>
                        <span className="text-xs text-stone-500">20% Margin</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Royalty Income</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$72K</span>
                        <span className="text-xs text-stone-500">Collected</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-purple-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Unit Volume</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$45K</span>
                        <span className="text-xs text-stone-500">Per Month</span>
                    </div>
                </div>
            </div>

            {/* Placeholder for detailed financial tables */}
            <div className="glass-panel rounded-xl p-8 text-center border border-stone-800">
                <DollarSign className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-100">Detailed Financial Statements</h3>
                <p className="text-stone-400 max-w-md mx-auto mt-2">
                    Consolidated P&L, Balance Sheet, and Cash Flow statements for the entire network are generated monthly.
                </p>
                <button className="mt-6 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 transition-colors">
                    Download Full Financial Pack (PDF)
                </button>
            </div>
        </ReportPageLayout>
    )
}
