import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Schedule | Oronex',
    description: 'Your personal appointment schedule',
    manifest: '/api/pwa/manifest?role=barber'
}

export default function MyScheduleLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
