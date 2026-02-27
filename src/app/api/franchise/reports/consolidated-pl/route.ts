'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Consolidated P&L across all franchise locations
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        // Only franchise-level roles can see consolidated P&L
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')

        const since = new Date()
        since.setDate(since.getDate() - days)

        // Get all locations
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, name: true }
        })

        const locationResults = []

        for (const location of locations) {
            // Revenue from completed transactions
            const transactions = await prisma.transaction.findMany({
                where: {
                    locationId: location.id,
                    status: 'COMPLETED',
                    createdAt: { gte: since }
                },
                select: {
                    total: true,
                    subtotal: true,
                    taxAmount: true,
                    paymentMethod: true
                }
            })

            const revenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
            const netSales = transactions.reduce((s, t) => s + Number(t.subtotal || 0), 0)
            const taxCollected = transactions.reduce((s, t) => s + Number(t.taxAmount || 0), 0)
            const txCount = transactions.length

            // COGS estimate from line items
            const lineItems = await prisma.transactionLineItem.findMany({
                where: {
                    transaction: {
                        locationId: location.id,
                        status: 'COMPLETED',
                        createdAt: { gte: since }
                    }
                },
                select: {
                    quantity: true,
                    unitPrice: true,
                    item: { select: { cost: true } }
                }
            })

            const cogs = lineItems.reduce((s, li) => {
                const cost = Number(li.item?.cost || 0)
                return s + cost * (li.quantity || 1)
            }, 0)

            const grossProfit = netSales - cogs
            const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0

            // Payment breakdown
            const cashSales = transactions.filter(t => t.paymentMethod === 'CASH')
                .reduce((s, t) => s + Number(t.total || 0), 0)
            const cardSales = transactions.filter(t => t.paymentMethod === 'CARD')
                .reduce((s, t) => s + Number(t.total || 0), 0)

            locationResults.push({
                locationId: location.id,
                locationName: location.name,
                transactionCount: txCount,
                revenue: Math.round(revenue * 100) / 100,
                netSales: Math.round(netSales * 100) / 100,
                taxCollected: Math.round(taxCollected * 100) / 100,
                cogs: Math.round(cogs * 100) / 100,
                grossProfit: Math.round(grossProfit * 100) / 100,
                grossMargin: Math.round(grossMargin * 10) / 10,
                cashSales: Math.round(cashSales * 100) / 100,
                cardSales: Math.round(cardSales * 100) / 100
            })
        }

        // Totals
        const totals = {
            transactionCount: locationResults.reduce((s, r) => s + r.transactionCount, 0),
            revenue: Math.round(locationResults.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
            netSales: Math.round(locationResults.reduce((s, r) => s + r.netSales, 0) * 100) / 100,
            taxCollected: Math.round(locationResults.reduce((s, r) => s + r.taxCollected, 0) * 100) / 100,
            cogs: Math.round(locationResults.reduce((s, r) => s + r.cogs, 0) * 100) / 100,
            grossProfit: Math.round(locationResults.reduce((s, r) => s + r.grossProfit, 0) * 100) / 100,
            grossMargin: 0,
            cashSales: Math.round(locationResults.reduce((s, r) => s + r.cashSales, 0) * 100) / 100,
            cardSales: Math.round(locationResults.reduce((s, r) => s + r.cardSales, 0) * 100) / 100
        }
        totals.grossMargin = totals.netSales > 0
            ? Math.round((totals.grossProfit / totals.netSales) * 1000) / 10
            : 0

        return ApiResponse.success({
            periodDays: days,
            locations: locationResults,
            totals
        })
    } catch (error) {
        console.error('[CONSOLIDATED_PL_GET]', error)
        return ApiResponse.error('Failed to generate P&L')
    }
}
