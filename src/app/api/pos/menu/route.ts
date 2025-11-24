import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // MOCK DATA FOR UI TESTING
    const services = [
        // THREADING
        { id: 's1', name: 'Eyebrows', price: 12, franchiseId: session.user.franchiseId },
        { id: 's2', name: 'Upper & Lower Lips', price: 8, franchiseId: session.user.franchiseId },
        { id: 's3', name: 'Chin, Neck & Forehead', price: 15, franchiseId: session.user.franchiseId },
        { id: 's4', name: 'Side Burn Half/Full', price: 10, franchiseId: session.user.franchiseId },
        { id: 's5', name: 'Full Face (No Neck)', price: 35, franchiseId: session.user.franchiseId },

        // WAXING
        { id: 's6', name: 'Full Face (No Neck)', price: 40, franchiseId: session.user.franchiseId }, // Duplicate name, different category logic? No, name is same.
        { id: 's7', name: 'Arm Half/full Waxing', price: 25, franchiseId: session.user.franchiseId },
        { id: 's8', name: 'Under Arm Waxing', price: 18, franchiseId: session.user.franchiseId },
        { id: 's9', name: 'Leg Half/Full Waxing', price: 45, franchiseId: session.user.franchiseId },

        // SPA
        { id: 's10', name: 'Express Facial', price: 50, franchiseId: session.user.franchiseId },
        { id: 's11', name: 'Deluxe Facial', price: 80, franchiseId: session.user.franchiseId },
        { id: 's12', name: 'Anti-Ageing Facial', price: 95, franchiseId: session.user.franchiseId },
        { id: 's13', name: 'Acne Facial', price: 85, franchiseId: session.user.franchiseId },

        // ADDITIONS
        { id: 's14', name: 'Eyebrow Tinting', price: 20, franchiseId: session.user.franchiseId },
        { id: 's15', name: 'Henna Tattoo', price: 25, franchiseId: session.user.franchiseId },
        { id: 's16', name: 'Natural/Full Eyelashes', price: 120, franchiseId: session.user.franchiseId },
        { id: 's17', name: 'Touch-ups', price: 50, franchiseId: session.user.franchiseId },
        { id: 's18', name: 'Eyelash Extension', price: 150, franchiseId: session.user.franchiseId },
    ]

    const products = [
        { id: 'p1', name: 'Argan Oil Shampoo', price: 25, franchiseId: session.user.franchiseId },
        { id: 'p2', name: 'Keratin Conditioner', price: 28, franchiseId: session.user.franchiseId },
        { id: 'p3', name: 'Styling Gel', price: 15, franchiseId: session.user.franchiseId },
        { id: 'p4', name: 'Hair Serum', price: 30, franchiseId: session.user.franchiseId },
    ]

    const discounts = []

    return NextResponse.json({ services, products, discounts })
}
