'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { AlertTriangle } from "lucide-react"

export default function RiskAnalysisPage() {
    return (
        <ReportPageLayout
            title="Location Risk Analysis"
            description="AI-powered risk assessment predicting potential location failures before they happen."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Risk Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Risk analysis will appear here once sufficient operational data is collected from your locations.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}
