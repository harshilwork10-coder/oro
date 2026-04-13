import { prisma } from '@/lib/prisma'

/**
 * ===== PROVIDER FEATURE GATE =====
 * Server-side enforcement of Provider-controlled feature toggles.
 * 
 * Checks BusinessConfig for the given franchisorId and returns whether
 * the requested feature is enabled. Falls back to `true` (allow) if
 * the config doesn't exist or the field is missing — safe upgrade path.
 * 
 * Usage:
 *   const allowed = await isFeatureEnabled(franchisorId, 'usesLoyalty')
 *   if (!allowed) return NextResponse.json({ error: 'Feature disabled' }, { status: 403 })
 */
export async function isFeatureEnabled(
    franchisorId: string | null | undefined,
    featureName: string
): Promise<boolean> {
    if (!franchisorId) return true // No franchisor context = allow (safety)

    try {
        const config = await prisma.businessConfig.findUnique({
            where: { franchisorId }
        })
        if (!config) return true // No config = allow (new franchisor, not yet configured)

        // Check if the feature field exists and is explicitly false
        if (featureName in config) {
            return (config as any)[featureName] !== false
        }

        // Field doesn't exist in config = allow by default
        return true
    } catch {
        // Schema mismatch or DB error = allow by default (safe upgrade)
        return true
    }
}

/**
 * Resolve the franchisorId for a given franchiseId.
 * Cached per-request via a simple lookup.
 */
export async function getFranchisorId(franchiseId: string | null | undefined): Promise<string | null> {
    if (!franchiseId) return null
    try {
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            select: { franchisorId: true }
        })
        return franchise?.franchisorId || null
    } catch {
        return null
    }
}

/**
 * Convenience: check a feature toggle for a franchise (resolves franchisorId internally).
 * 
 * Usage:
 *   const allowed = await isFeatureEnabledForFranchise(user.franchiseId, 'usesMemberships')
 */
export async function isFeatureEnabledForFranchise(
    franchiseId: string | null | undefined,
    featureName: string
): Promise<boolean> {
    const franchisorId = await getFranchisorId(franchiseId)
    return isFeatureEnabled(franchisorId, featureName)
}
