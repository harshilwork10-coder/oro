import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST /api/lottery/packs/activate-by-scan - Activate pack by scanning barcode
// This enables the "scan to activate" feature for lottery pack management
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return ApiResponse.unauthorized()
        }

        const franchiseId = session.user.franchiseId
        const body = await request.json()
        const { barcode, locationId } = body

        if (!barcode) {
            return ApiResponse.validationError('Pack barcode is required')
        }

        // Parse pack barcode - common formats:
        // - 7-digit pack number: 1234567
        // - Lottery state format: GAME-PACKNUMBER (e.g., 001-1234567)

        let packNumber = barcode.trim()
        let gameNumber: string | null = null

        // Check for GAME-PACK format
        if (barcode.includes('-')) {
            const parts = barcode.split('-')
            gameNumber = parts[0]
            packNumber = parts[1] || parts[0]
        }

        // Check if pack already exists
        const existingPack = await prisma.lotteryPack.findFirst({
            where: {
                packNumber: packNumber,
                game: { franchiseId: franchiseId }
            },
            include: { game: true }
        })

        if (existingPack) {
            if (existingPack.status === 'ACTIVE' || existingPack.status === 'ACTIVATED') {
                return ApiResponse.error('Pack already activated', 400)
            }

            // Pack exists but not active - activate it
            const activatedPack = await prisma.lotteryPack.update({
                where: { id: existingPack.id },
                data: {
                    status: 'ACTIVATED',
                    activatedAt: new Date()
                },
                include: { game: true }
            })

            return ApiResponse.success({
                pack: activatedPack,
                message: `Pack #${packNumber} activated`,
                gameName: activatedPack.game?.gameName || 'Unknown Game'
            })
        }

        // Pack doesn't exist - need to create it
        // Find a game to assign (by game number if provided)
        let game = null

        if (gameNumber) {
            game = await prisma.lotteryGame.findFirst({
                where: {
                    franchiseId: franchiseId,
                    gameNumber: gameNumber
                }
            })
        }

        // Get location for this franchise
        let targetLocationId = locationId
        if (!targetLocationId) {
            const defaultLocation = await prisma.location.findFirst({
                where: { franchise: { id: franchiseId } },
                select: { id: true }
            })
            targetLocationId = defaultLocation?.id
        }

        if (!targetLocationId) {
            return ApiResponse.error('No location found', 400)
        }

        // If no game found, use any active game or create default
        if (!game) {
            game = await prisma.lotteryGame.findFirst({
                where: { franchiseId: franchiseId, isActive: true }
            })

            if (!game) {
                game = await prisma.lotteryGame.create({
                    data: {
                        franchiseId: franchiseId,
                        gameName: gameNumber ? `Game #${gameNumber}` : 'Scratch Ticket',
                        gameNumber: gameNumber || packNumber.slice(-3) || 'DEFAULT',
                        ticketPrice: 1.00,
                        isActive: true
                    }
                })
            }
        }

        // Create and activate the pack using only valid schema fields
        const newPack = await prisma.lotteryPack.create({
            data: {
                gameId: game.id,
                locationId: targetLocationId,
                packNumber: packNumber,
                ticketCount: 300,
                soldCount: 0,
                status: 'ACTIVATED',
                activatedAt: new Date()
            },
            include: { game: true }
        })

        return ApiResponse.created({
            pack: newPack,
            message: `Pack #${packNumber} activated`,
            gameName: newPack.game?.gameName || 'Unknown Game',
            wasCreated: true
        })

    } catch (error) {
        console.error('Failed to activate pack by scan:', error)
        return ApiResponse.serverError('Failed to activate pack')
    }
}
