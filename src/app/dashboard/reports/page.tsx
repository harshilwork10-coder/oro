'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    FileText,
    BarChart3,
    TrendingUp,
    DollarSign,
    Shield,
    Users,
    MapPin,
    AlertTriangle,
    ArrowRight,
    Download,
    Calendar,
    Clock,
    Store,
    PieChart
} from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const isFranchisee = session?.user?.role === 'FRANCHISEE'

    if (isFranchisee) {
        return <FranchiseeReportsDashboard />
    }

    return <FranchisorReportsDashboard />
}

function FranchisorReportsDashboard() {
    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Reports Dashboard</h1>
                    <p className="text-stone-400 mt-2">Comprehensive insights into your franchise network performance</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                    <Download className="h-4 w-4" />
                    Export Summary
                </button>
            </div>

            {/* Executive Summary Snapshot */}
            <div className="glass-panel rounded-xl p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-orange-500" />
                        Network Snapshot
                    </h2>
                    <span className="text-sm text-stone-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated: Just now
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Total Network Sales (Today)</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">$127,450</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +12% vs LW
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Active Locations</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">42</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +2 New
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Avg Transaction Value</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">$24.50</span>
                            <span className="text-xs font-medium text-amber-400 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +1.5%
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Network Compliance</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">87%</span>
                            <span className="text-xs font-medium text-stone-400">Target: 90%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Access */}
            <div>
                <h3 className="text-lg font-semibold text-stone-100 mb-4">Quick Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/reports/same-store-sales" className="group p-4 glass-panel rounded-lg hover:border-orange-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">Same-Store Sales</span>
                        </div>
                        <p className="text-sm text-stone-500">Track organic growth across established locations</p>
                    </Link>
                    <Link href="/dashboard/reports/compliance" className="group p-4 glass-panel rounded-lg hover:border-orange-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <Shield className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">Compliance Scorecard</span>
                        </div>
                        <p className="text-sm text-stone-500">Monitor brand standards and operational compliance</p>
                    </Link>
                    <Link href="/dashboard/reports/risk-analysis" className="group p-4 glass-panel rounded-lg hover:border-orange-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">Location Risk Analysis</span>
                        </div>
                        <p className="text-sm text-stone-500">AI-predicted risks and intervention needs</p>
                    </Link>
                </div>
            </div>

            {/* All Reports Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Financial Reports */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-orange-500" />
                        Financial Performance
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Royalty Revenue Report"
                            description="Detailed breakdown of royalties collected by location"
                            href="/dashboard/reports/royalties"
                        />
                        <ReportLink
                            title="Profit & Loss by Location"
                            description="Net profit margins and expense analysis"
                            href="/dashboard/reports/pnl"
                        />
                        <ReportLink
                            title="Network Financial Summary"
                            description="Consolidated financial health of the entire network"
                            href="/dashboard/reports/financial-summary"
                        />
                        <ReportLink
                            title="Break-Even Analysis"
                            description="Track locations against their break-even points"
                            href="/dashboard/reports/break-even"
                        />
                    </div>
                </div>

                {/* Sales & Operations */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-orange-500" />
                        Sales & Operations
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Revenue by Location"
                            description="Compare sales performance across all units"
                            href="/dashboard/reports/revenue"
                        />
                        <ReportLink
                            title="Labor Efficiency"
                            description="Labor cost % and productivity metrics"
                            href="/dashboard/reports/labor"
                        />
                        <ReportLink
                            title="COGS & Inventory"
                            description="Food costs and inventory turnover rates"
                            href="/dashboard/reports/cogs"
                        />
                        <ReportLink
                            title="Transaction Analysis"
                            description="Peak times, average ticket, and payment methods"
                            href="/dashboard/reports/transactions"
                        />
                    </div>
                </div>

                {/* Customer & Marketing */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        Customer & Marketing
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Customer Satisfaction (NPS)"
                            description="Net Promoter Scores and feedback trends"
                            href="/dashboard/reports/nps"
                        />
                        <ReportLink
                            title="Marketing ROI"
                            description="Campaign effectiveness and acquisition costs"
                            href="/dashboard/reports/marketing"
                        />
                        <ReportLink
                            title="Customer Retention"
                            description="Repeat rates and churn analysis"
                            href="/dashboard/reports/retention"
                        />
                    </div>
                </div>

                {/* Benchmarking & Strategy */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-500" />
                        Benchmarking & Strategy
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Location Comparison"
                            description="Side-by-side performance benchmarking"
                            href="/dashboard/reports/benchmarking"
                        />
                        <ReportLink
                            title="Franchisee Performance"
                            description="Portfolio analysis for multi-unit owners"
                            href="/dashboard/reports/franchisee-performance"
                        />
                        <ReportLink
                            title="Territory Analysis"
                            description="Market saturation and expansion opportunities"
                            href="/dashboard/reports/territory"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function FranchiseeReportsDashboard() {
    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Franchise Reports</h1>
                    <p className="text-stone-400 mt-2">Performance insights for your locations</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                    <Download className="h-4 w-4" />
                    Export My Data
                </button>
            </div>

            {/* Franchisee Snapshot */}
            <div className="glass-panel rounded-xl p-6 border-l-4 border-emerald-500">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
                        <Store className="h-5 w-5 text-emerald-500" />
                        My Business Snapshot
                    </h2>
                    <span className="text-sm text-stone-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated: Just now
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">My Total Sales (Today)</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">$4,250</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +5% vs LW
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Customer Count</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">185</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                +12
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">Labor Cost %</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">28.5%</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                On Target
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                        <p className="text-sm text-stone-500 mb-1">My Compliance Score</p>
                        <div className="flex items-end justify-between">
                            <span className="text-2xl font-bold text-stone-100">94%</span>
                            <span className="text-xs font-medium text-emerald-400">Excellent</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Access for Franchisee */}
            <div>
                <h3 className="text-lg font-semibold text-stone-100 mb-4">Quick Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/reports/pnl" className="group p-4 glass-panel rounded-lg hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">My Profit & Loss</span>
                        </div>
                        <p className="text-sm text-stone-500">View detailed profitability for your locations</p>
                    </Link>
                    <Link href="/dashboard/reports/labor" className="group p-4 glass-panel rounded-lg hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <Users className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">Labor Efficiency</span>
                        </div>
                        <p className="text-sm text-stone-500">Track your team's productivity and costs</p>
                    </Link>
                    <Link href="/dashboard/reports/nps" className="group p-4 glass-panel rounded-lg hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                <Store className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-stone-100">Customer Feedback</span>
                        </div>
                        <p className="text-sm text-stone-500">See what your local customers are saying</p>
                    </Link>
                </div>
            </div>

            {/* Franchisee Report Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Financials */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        My Financials
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Profit & Loss Statement"
                            description="Monthly revenue and expense breakdown"
                            href="/dashboard/reports/pnl"
                        />
                        <ReportLink
                            title="Royalty Payments"
                            description="History of royalty fees paid"
                            href="/dashboard/reports/royalties"
                        />
                        <ReportLink
                            title="Break-Even Analysis"
                            description="Track progress towards profitability"
                            href="/dashboard/reports/break-even"
                        />
                    </div>
                </div>

                {/* Operations */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                        Store Operations
                    </h3>
                    <div className="space-y-2">
                        <ReportLink
                            title="Sales Performance"
                            description="Daily and weekly sales trends"
                            href="/dashboard/reports/revenue"
                        />
                        <ReportLink
                            title="Labor & Staffing"
                            description="Schedule efficiency and labor costs"
                            href="/dashboard/reports/labor"
                        />
                        <ReportLink
                            title="Inventory & COGS"
                            description="Food cost analysis and waste tracking"
                            href="/dashboard/reports/cogs"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function ReportLink({ title, description, href }: { title: string, description: string, href: string }) {
    return (
        <Link href={href} className="block p-4 bg-stone-900/30 hover:bg-stone-800 rounded-lg border border-stone-800 hover:border-orange-500/30 transition-all group">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-stone-200 group-hover:text-orange-400 transition-colors">{title}</h4>
                    <p className="text-sm text-stone-500">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-orange-500 transition-colors" />
            </div>
        </Link>
    )
}
