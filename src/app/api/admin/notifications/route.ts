import { NextRequest, NextResponse } from 'next/server'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Mock notifications (in production, store in database)
        const notifications = [
            {
                id: '1',
                type: 'success',
                title: 'New client onboarded',
                message: 'Beauty Downtown signed up with 3 locations',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
                read: false
            },
            {
                id: '2',
                type: 'info',
                title: 'Agent added client',
                message: 'John Doe brought in Spa Elite',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
                read: false
            },
            {
                id: '3',
                type: 'success',
                title: 'Location activated',
                message: 'Westside Beauty - Terminal configured',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                read: true
            }
        ]

        return NextResponse.json({ notifications })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}

