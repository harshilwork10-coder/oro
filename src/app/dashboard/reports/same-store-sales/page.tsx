'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp } from "lucide-react"

export default function SameStoreSalesPage() {
    return (
        <ReportPageLayout
            title="Same-Store Sales Growth"
            description="Analyze organic growth by comparing current sales to prior periods for established locations."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <TrendingUp className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Sales Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Same-store sales growth will appear here once sales data is recorded over time.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

