import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        console.log('[DB-SYNC] Attempting to apply schema hotfixes...')
        
        let schemaChangesApplied = []

        // Safely add missing columns to the Transaction table in production
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "appliedPromotions" TEXT;`)
            schemaChangesApplied.push('Transaction.appliedPromotions added successfully')
        } catch (e: any) {
            schemaChangesApplied.push(`Transaction.appliedPromotions error: ${e.message}`)
        }

        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "promoDiscount" DECIMAL(12,2);`)
            schemaChangesApplied.push('Transaction.promoDiscount added successfully')
        } catch (e: any) {
             schemaChangesApplied.push(`Transaction.promoDiscount error: ${e.message}`)
        }

        return NextResponse.json({
            status: 'Success',
            message: 'Database Schema Sync Completed',
            logs: schemaChangesApplied
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
