'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { FileText } from "lucide-react"

export default function TransactionsReportPage() {
    return (
        <ReportPageLayout
            title="Transaction Analysis"
            description="Analyze transaction volumes, average ticket values, and peak operational hours."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <FileText className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Transaction Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Transaction metrics and analysis will appear here once transactions are processed.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

