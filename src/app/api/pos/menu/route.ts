import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    console.log('[API_MENU_DEBUG] Session User:', JSON.stringify(session?.user, null, 2))

    if (!session?.user) {
        console.log('[API_MENU_DEBUG] No session user found')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow access if user exists. 
    // We use a default franchiseId if none exists to allow the demo to work.
    const franchiseId = session.user.franchiseId || 'default'
    console.log('[API_MENU_DEBUG] Using Franchise ID:', franchiseId)

    // MOCK DATA FOR UI TESTING
    const services = [
        // THREADING
        { id: 's1', name: 'Eyebrows', price: 12, franchiseId, category: 'THREADING' },
        { id: 's2', name: 'Upper & Lower Lips', price: 8, franchiseId, category: 'THREADING' },
        { id: 's3', name: 'Chin, Neck & Forehead', price: 15, franchiseId, category: 'THREADING' },
        { id: 's4', name: 'Side Burn Half/Full', price: 10, franchiseId, category: 'THREADING' },
        { id: 's5', name: 'Full Face (No Neck)', price: 35, franchiseId, category: 'THREADING' },

        // WAXING
        { id: 's6', name: 'Full Face (No Neck)', price: 40, franchiseId, category: 'WAXING' },
        { id: 's7', name: 'Arm Half/full Waxing', price: 25, franchiseId, category: 'WAXING' },
        { id: 's8', name: 'Under Arm Waxing', price: 18, franchiseId, category: 'WAXING' },
        { id: 's9', name: 'Leg Half/Full Waxing', price: 45, franchiseId, category: 'WAXING' },

        // SPA
        { id: 's10', name: 'Express Facial', price: 50, franchiseId, category: 'SPA' },
        { id: 's11', name: 'Deluxe Facial', price: 80, franchiseId, category: 'SPA' },
        { id: 's12', name: 'Anti-Ageing Facial', price: 95, franchiseId, category: 'SPA' },
        { id: 's13', name: 'Acne Facial', price: 85, franchiseId, category: 'SPA' },

        // ADDITIONS
        { id: 's14', name: 'Eyebrow Tinting', price: 20, franchiseId, category: 'ADDITIONS' },
        { id: 's15', name: 'Henna Tattoo', price: 25, franchiseId, category: 'ADDITIONS' },
        { id: 's16', name: 'Natural/Full Eyelashes', price: 120, franchiseId, category: 'ADDITIONS' },
        { id: 's17', name: 'Touch-ups', price: 50, franchiseId, category: 'ADDITIONS' },
        { id: 's18', name: 'Eyelash Extension', price: 150, franchiseId, category: 'ADDITIONS' },
    ]

    const products = [
        { id: 'p1', name: 'Argan Oil Shampoo', price: 25, franchiseId, category: 'PRODUCTS' },
        { id: 'p2', name: 'Keratin Conditioner', price: 28, franchiseId, category: 'PRODUCTS' },
        { id: 'p3', name: 'Styling Gel', price: 15, franchiseId, category: 'PRODUCTS' },
        { id: 'p4', name: 'Hair Serum', price: 30, franchiseId, category: 'PRODUCTS' },
    ]

    const discounts: any[] = []

    return NextResponse.json({ services, products, discounts })
}
