/**
 * Saved Views API
 * 
 * CRUD for named location filters (HQ feature)
 * Uses localStorage approach since User model doesn't have settings field
 * In production, consider adding a SavedView model to Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Note: This is a simplified implementation
// In production, add a SavedView model to store these server-side

interface SavedView {
    id: string;
    name: string;
    filters: Record<string, string>;
    createdAt: string;
}

// In-memory store (for demo - in production use database)
const viewStore = new Map<string, SavedView[]>();

// GET - List saved views
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const savedViews = viewStore.get(userId) || [];

        return NextResponse.json({ savedViews });
    } catch (error) {
        console.error('[Saved Views] Error:', error);
        return NextResponse.json({ error: 'Failed to load saved views' }, { status: 500 });
    }
}

// POST - Create saved view
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const body = await request.json();
        const { name, filters } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name required' }, { status: 400 });
        }

        const savedViews = viewStore.get(userId) || [];

        const newView: SavedView = {
            id: `view_${Date.now()}`,
            name,
            filters: filters || {},
            createdAt: new Date().toISOString()
        };

        savedViews.push(newView);
        viewStore.set(userId, savedViews);

        return NextResponse.json({ view: newView });
    } catch (error) {
        console.error('[Saved Views] Error:', error);
        return NextResponse.json({ error: 'Failed to create saved view' }, { status: 500 });
    }
}

// DELETE - Remove saved view
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const { searchParams } = new URL(request.url);
        const viewId = searchParams.get('id');

        if (!viewId) {
            return NextResponse.json({ error: 'View ID required' }, { status: 400 });
        }

        const savedViews = (viewStore.get(userId) || []).filter(v => v.id !== viewId);
        viewStore.set(userId, savedViews);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Saved Views] Error:', error);
        return NextResponse.json({ error: 'Failed to delete saved view' }, { status: 500 });
    }
}
