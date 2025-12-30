'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { BarChart3 } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function BenchmarkingReportPage() {
    return (
        <ReportPageLayout
            title="Location Comparison"
            description="Benchmark locations side-by-side across key operational and financial metrics."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Benchmarking Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Location benchmarks will appear here once performance data is collected from multiple locations.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedBenchmarkingReport() {
    return (
        <WithReportPermission reportType="benchmarking">
            <BenchmarkingReportPage />
        </WithReportPermission>
    )
}

