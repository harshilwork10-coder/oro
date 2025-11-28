import { prisma } from '@/lib/prisma'

export class GamificationService {
    /**
     * Calculates the leaderboard based on a weighted score of:
     * - Revenue (40%)
     * - Health Score (30%)
     * - Community Engagement (30%)
     */
    static async getLeaderboard() {
        const franchises = await prisma.franchise.findMany({
            include: {
                users: {
                    include: {
                        _count: {
                            select: {
                                posts: true,
                                comments: true
                            }
                        }
                        // badges: {  // UserBadge model doesn't have badge relation properly defined
                        //     include: {
                        //         badge: true
                        //     }
                        // }
                    }
                }
                // healthScoreHistory: true  // Model doesn't exist
            }
        })

        const leaderboard = franchises.map(franchise => {
            // 1. Revenue Score (Normalized 0-100, assuming 100k is max target for now)
            // In a real app, this would be dynamic based on targets.
            // For MVP, we'll use a placeholder or derive from health score if revenue isn't explicitly tracked yet.
            // Let's use the health score's revenue component if available, or default to a random value for demo.
            const revenueScore = 0 // Placeholder until we have real revenue data linked

            // 2. Health Score (0-100)
            // Sort manually since we removed orderBy from query for debugging
            const latestHealthScore: any = null // franchise.healthScoreHistory?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            const healthScore = latestHealthScore?.score || 0

            // 3. Community Score (Based on posts/comments)
            const totalPosts = franchise.users.reduce((sum: number, user: any) => sum + user._count.posts, 0)
            const totalComments = franchise.users.reduce((sum: number, user: any) => sum + user._count.comments, 0)
            const communityScore = Math.min((totalPosts * 5) + (totalComments * 2), 100) // Cap at 100

            // Weighted Total
            const totalScore = Math.round(
                (revenueScore * 0.4) +
                (healthScore * 0.3) +
                (communityScore * 0.3)
            )

            return {
                id: franchise.id,
                name: franchise.name,
                totalScore,
                metrics: {
                    revenue: revenueScore,
                    health: healthScore,
                    community: communityScore
                },
                badges: [] // franchise.users.flatMap((u: any) => u.badges.map((b: any) => b.badge))
            }
        })

        return leaderboard.sort((a: any, b: any) => b.totalScore - a.totalScore)
    }

    /**
     * Checks and awards badges for a specific user
     */
    static async checkBadges(userId: string) {
        /* // Badge system not fully implemented
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: { posts: true, comments: true }
                },
                badges: {
                    include: {
                        badge: true
                    }
                }
            }
        })

        if (!user) return

        const badgesToAward: string[] = []

        // Rule 1: "Community Starter" - First Post
        if (user._count.posts >= 1) {
            badgesToAward.push('COMMUNITY_STARTER')
        }

        // Rule 2: "Conversation Starter" - 5 Posts
        if (user._count.posts >= 5) {
            badgesToAward.push('CONVERSATION_STARTER')
        }

        // Rule 3: "Helpful Peer" - 10 Comments
        if (user._count.comments >= 10) {
            badgesToAward.push('HELPFUL_PEER')
        }

        for (const badgeName of badgesToAward) {
            // Check if already awarded
            const hasBadge = user.badges.some((ub: any) => ub.badge.name === badgeName)

            if (!hasBadge) {
                // Find or create badge definition
                let badge = await prisma.badge.findUnique({ where: { name: badgeName } })

                if (!badge) {
                    // Create default badges if they don't exist
                    const badgeInfo = this.getBadgeInfo(badgeName)
                    badge = await prisma.badge.create({ data: badgeInfo })
                }

                // Award badge
                await prisma.userBadge.create({
                    data: {
                        userId,
                        badgeId: badge.id
                    }
                })
            }
        }
        */
        console.log('Badge checking skipped (badge system not fully implemented)')
    }

    private static getBadgeInfo(name: string) {
        switch (name) {
            case 'COMMUNITY_STARTER':
                return { name, description: 'Created your first community post', icon: 'MessageSquare', category: 'COMMUNITY' }
            case 'CONVERSATION_STARTER':
                return { name, description: 'Created 5 community posts', icon: 'MessageCircle', category: 'COMMUNITY' }
            case 'HELPFUL_PEER':
                return { name, description: 'Posted 10 comments', icon: 'Heart', category: 'COMMUNITY' }
            default:
                return { name, description: 'Achievement Unlocked', icon: 'Star', category: 'GENERAL' }
        }
    }
}
