import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LocalBrain } from '@/lib/ai/local-brain'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { query } = await request.json()

        if (!query) {
            return NextResponse.json({ response: "I'm listening..." })
        }

        // Use the new Local Brain
        const responseText = await LocalBrain.processQuery(query, session.user.id || session.user.email)

        return NextResponse.json({
            response: responseText,
            data: null // Can expand to return charts later
        })

    } catch (error) {
        console.error('AI Error:', error)
        return NextResponse.json({ response: "My brain is a bit foggy (Server Error)." })
    }
}
