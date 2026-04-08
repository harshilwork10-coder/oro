import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Check In | ORO 9',
    description: 'Scan the QR code at your salon to check in for your appointment.',
}

export default function CheckinLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Bare layout — no sidebar, no auth, no dashboard chrome
    // This is a public customer-facing page opened on their phone
    return <>{children}</>
}
