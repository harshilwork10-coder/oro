import { NextRequest, NextResponse } from 'next/server'

// License validation feature - NOT IMPLEMENTED
// The required Prisma models (License, RegisteredTerminal) do not exist in the current schema.

export async function POST(req: NextRequest) {
    return NextResponse.json(
        {
            error: 'License validation feature is not implemented',
            message: 'This feature requires License and RegisteredTerminal models that are not in the current schema.'
        },
        { status: 501 }
    )
}

export async function GET(req: NextRequest) {
    return NextResponse.json(
        {
            error: 'License lookup feature is not implemented',
            message: 'This feature requires License model that is not in the current schema.'
        },
        { status: 501 }
    )
}

