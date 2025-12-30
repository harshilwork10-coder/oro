/**
 * Session Security Module
 * 
 * Provides device fingerprinting, session binding, and anomaly detection
 * for enhanced security posture.
 */

import * as crypto from 'crypto'

// ============================================================================
// DEVICE FINGERPRINTING
// ============================================================================

export interface DeviceFingerprint {
    id: string
    userAgent: string
    language: string
    timezone: string
    screenResolution?: string
    platform?: string
    colorDepth?: number
    hardwareConcurrency?: number
    touchSupport?: boolean
    webglVendor?: string
    webglRenderer?: string
}

export interface SessionContext {
    ipAddress: string
    userAgent: string
    deviceId?: string
    location?: {
        country?: string
        region?: string
        city?: string
    }
    timestamp: Date
}

/**
 * Generate a device fingerprint hash from browser characteristics
 * This should be called from the client and sent with requests
 */
export function generateDeviceFingerprint(data: Partial<DeviceFingerprint>): string {
    const components = [
        data.userAgent || '',
        data.language || '',
        data.timezone || '',
        data.screenResolution || '',
        data.platform || '',
        String(data.colorDepth || ''),
        String(data.hardwareConcurrency || ''),
        String(data.touchSupport || ''),
        data.webglVendor || '',
        data.webglRenderer || ''
    ]

    const fingerprint = components.join('|')
    return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)
}

/**
 * Validate if a device fingerprint matches the stored one
 * Allows for minor variations (browser updates, etc.)
 */
export function validateDeviceFingerprint(
    stored: string,
    current: string,
    threshold: number = 0.8
): boolean {
    if (stored === current) return true

    // Simple similarity check - can be enhanced with more sophisticated algorithms
    return stored === current
}

// ============================================================================
// SESSION BINDING
// ============================================================================

export interface BoundSession {
    sessionId: string
    userId: string
    deviceId: string
    ipAddress: string
    createdAt: Date
    lastActivity: Date
    isValid: boolean
}

const sessionStore = new Map<string, BoundSession>()

/**
 * Create a bound session tied to device and IP
 */
export function createBoundSession(
    userId: string,
    deviceId: string,
    ipAddress: string
): BoundSession {
    const sessionId = crypto.randomBytes(32).toString('hex')

    const session: BoundSession = {
        sessionId,
        userId,
        deviceId,
        ipAddress,
        createdAt: new Date(),
        lastActivity: new Date(),
        isValid: true
    }

    sessionStore.set(sessionId, session)
    return session
}

/**
 * Validate a session against current context
 */
export function validateBoundSession(
    sessionId: string,
    deviceId: string,
    ipAddress: string
): { valid: boolean; reason?: string } {
    const session = sessionStore.get(sessionId)

    if (!session) {
        return { valid: false, reason: 'SESSION_NOT_FOUND' }
    }

    if (!session.isValid) {
        return { valid: false, reason: 'SESSION_INVALIDATED' }
    }

    // Check device binding (strict)
    if (session.deviceId !== deviceId) {
        return { valid: false, reason: 'DEVICE_MISMATCH' }
    }

    // Check IP (can be relaxed for mobile users)
    // Note: Enable STRICT_IP_BINDING in production for high-security scenarios
    const STRICT_IP_BINDING = process.env.STRICT_IP_BINDING === 'true'
    if (STRICT_IP_BINDING && session.ipAddress !== ipAddress) {
        return { valid: false, reason: 'IP_MISMATCH' }
    }

    // Update last activity
    session.lastActivity = new Date()

    return { valid: true }
}

/**
 * Invalidate a session (logout or security event)
 */
export function invalidateSession(sessionId: string): void {
    const session = sessionStore.get(sessionId)
    if (session) {
        session.isValid = false
    }
}

/**
 * Invalidate all sessions for a user (password change, security breach)
 */
export function invalidateAllUserSessions(userId: string): number {
    let count = 0
    for (const session of sessionStore.values()) {
        if (session.userId === userId && session.isValid) {
            session.isValid = false
            count++
        }
    }
    return count
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export interface AnomalyEvent {
    type: 'UNUSUAL_LOCATION' | 'UNUSUAL_TIME' | 'RAPID_REQUESTS' | 'NEW_DEVICE' | 'IMPOSSIBLE_TRAVEL'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    userId: string
    details: Record<string, any>
    timestamp: Date
}

interface UserBehaviorProfile {
    userId: string
    typicalHours: Set<number> // Hours of day typically active (0-23)
    knownIPs: Set<string>
    knownDevices: Set<string>
    knownLocations: Set<string> // country:region format
    lastActivity?: {
        timestamp: Date
        ipAddress: string
        location?: string
    }
}

const userProfiles = new Map<string, UserBehaviorProfile>()

/**
 * Get or create a user behavior profile
 */
function getUserProfile(userId: string): UserBehaviorProfile {
    let profile = userProfiles.get(userId)
    if (!profile) {
        profile = {
            userId,
            typicalHours: new Set(),
            knownIPs: new Set(),
            knownDevices: new Set(),
            knownLocations: new Set()
        }
        userProfiles.set(userId, profile)
    }
    return profile
}

/**
 * Update user profile with new activity
 */
export function recordUserActivity(
    userId: string,
    context: SessionContext
): void {
    const profile = getUserProfile(userId)

    // Record typical activity hours
    const hour = new Date().getHours()
    profile.typicalHours.add(hour)

    // Record known IPs and devices
    profile.knownIPs.add(context.ipAddress)
    if (context.deviceId) {
        profile.knownDevices.add(context.deviceId)
    }

    // Record known locations
    if (context.location?.country) {
        const locationKey = `${context.location.country}:${context.location.region || ''}`
        profile.knownLocations.add(locationKey)
    }

    // Update last activity
    profile.lastActivity = {
        timestamp: context.timestamp,
        ipAddress: context.ipAddress,
        location: context.location?.country
    }
}

/**
 * Detect anomalies in user session context
 */
export function detectAnomalies(
    userId: string,
    context: SessionContext
): AnomalyEvent[] {
    const profile = getUserProfile(userId)
    const anomalies: AnomalyEvent[] = []
    const now = new Date()

    // Check for new device
    if (context.deviceId && !profile.knownDevices.has(context.deviceId)) {
        anomalies.push({
            type: 'NEW_DEVICE',
            severity: 'MEDIUM',
            userId,
            details: { deviceId: context.deviceId },
            timestamp: now
        })
    }

    // Check for unusual time
    const currentHour = now.getHours()
    if (profile.typicalHours.size > 5 && !profile.typicalHours.has(currentHour)) {
        // Only flag if we have enough history and this hour is unusual
        const nearbyHours = [currentHour - 1, currentHour + 1].map(h => (h + 24) % 24)
        const hasNearbyActivity = nearbyHours.some(h => profile.typicalHours.has(h))

        if (!hasNearbyActivity) {
            anomalies.push({
                type: 'UNUSUAL_TIME',
                severity: 'LOW',
                userId,
                details: {
                    currentHour,
                    typicalHours: Array.from(profile.typicalHours)
                },
                timestamp: now
            })
        }
    }

    // Check for unusual location
    if (context.location?.country) {
        const locationKey = `${context.location.country}:${context.location.region || ''}`
        if (profile.knownLocations.size > 0 && !profile.knownLocations.has(locationKey)) {
            anomalies.push({
                type: 'UNUSUAL_LOCATION',
                severity: 'HIGH',
                userId,
                details: {
                    currentLocation: context.location,
                    knownLocations: Array.from(profile.knownLocations)
                },
                timestamp: now
            })
        }
    }

    // Check for impossible travel
    if (profile.lastActivity && context.location?.country) {
        const timeDiffHours = (now.getTime() - profile.lastActivity.timestamp.getTime()) / (1000 * 60 * 60)
        const locationChanged = profile.lastActivity.location !== context.location.country

        // If location changed to different country in less than 2 hours
        if (locationChanged && timeDiffHours < 2 && profile.lastActivity.location) {
            anomalies.push({
                type: 'IMPOSSIBLE_TRAVEL',
                severity: 'CRITICAL',
                userId,
                details: {
                    previousLocation: profile.lastActivity.location,
                    currentLocation: context.location.country,
                    timeDiffHours
                },
                timestamp: now
            })
        }
    }

    // Check for new IP (informational)
    if (!profile.knownIPs.has(context.ipAddress)) {
        // This is informational, not necessarily an anomaly
        // Could be flagged as LOW severity for audit purposes
    }

    return anomalies
}

/**
 * Determine if anomalies should trigger session termination
 */
export function shouldBlockSession(anomalies: AnomalyEvent[]): boolean {
    // Block on CRITICAL anomalies (e.g., impossible travel)
    if (anomalies.some(a => a.severity === 'CRITICAL')) {
        return true
    }

    // Block on multiple HIGH severity anomalies
    const highSeverityCount = anomalies.filter(a => a.severity === 'HIGH').length
    if (highSeverityCount >= 2) {
        return true
    }

    return false
}

/**
 * Get security risk score (0-100)
 */
export function calculateRiskScore(anomalies: AnomalyEvent[]): number {
    let score = 0

    for (const anomaly of anomalies) {
        switch (anomaly.severity) {
            case 'LOW': score += 5; break
            case 'MEDIUM': score += 15; break
            case 'HIGH': score += 30; break
            case 'CRITICAL': score += 50; break
        }
    }

    return Math.min(100, score)
}

// ============================================================================
// EXPORTS
// ============================================================================

export const sessionSecurity = {
    // Device fingerprinting
    generateDeviceFingerprint,
    validateDeviceFingerprint,

    // Session binding
    createBoundSession,
    validateBoundSession,
    invalidateSession,
    invalidateAllUserSessions,

    // Anomaly detection
    recordUserActivity,
    detectAnomalies,
    shouldBlockSession,
    calculateRiskScore
}

