import type { Metadata } from 'next'

// Dynamic metadata generation for shop-specific booking pages
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params

    return {
        title: 'Book Appointment',
        description: 'Book your appointment online',
        manifest: `/api/pwa/manifest?shop=${slug}`
    }
}

export default function BookLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
