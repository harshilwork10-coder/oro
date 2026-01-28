import { NextRequest, NextResponse } from 'next/server'

// Android App Version Configuration
// Update these values when releasing new versions
const APP_CONFIG = {
    // Current latest version available for download
    latestVersion: "1.0.0",
    latestVersionCode: 1,

    // Minimum version required to use the app (force update below this)
    minSupportedVersionCode: 1,

    // Download URL for the APK (can be PaxStore, S3, Supabase, etc.)
    downloadUrl: "https://www.paxstore.us/app/oro-pos",

    // Release notes shown to users
    releaseNotes: "Initial release",

    // If true, users below minSupportedVersionCode cannot use app
    forceUpdateBelowMinVersion: true
}

/**
 * GET /api/app/version-check
 * 
 * Returns the latest app version info for Android auto-update checks.
 * The Android app calls this on startup to check if an update is available.
 * 
 * Query params:
 * - currentVersion: (optional) Current app versionCode for logging
 * 
 * Response:
 * {
 *   latestVersion: "1.0.1",
 *   latestVersionCode: 2,
 *   minSupportedVersionCode: 1,
 *   downloadUrl: "https://...",
 *   releaseNotes: "...",
 *   forceUpdate: false
 * }
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const currentVersionCode = searchParams.get('currentVersion')

        // Log version check for analytics (optional)
        if (currentVersionCode) {
            console.log(`[Version Check] Device running versionCode: ${currentVersionCode}`)
        }

        // Determine if this version requires force update
        const currentVersion = currentVersionCode ? parseInt(currentVersionCode, 10) : 0
        const forceUpdate = currentVersion > 0 &&
            currentVersion < APP_CONFIG.minSupportedVersionCode &&
            APP_CONFIG.forceUpdateBelowMinVersion

        return NextResponse.json({
            latestVersion: APP_CONFIG.latestVersion,
            latestVersionCode: APP_CONFIG.latestVersionCode,
            minSupportedVersionCode: APP_CONFIG.minSupportedVersionCode,
            downloadUrl: APP_CONFIG.downloadUrl,
            releaseNotes: APP_CONFIG.releaseNotes,
            forceUpdate
        })
    } catch (error) {
        console.error('[Version Check] Error:', error)
        return NextResponse.json(
            { error: 'Failed to check version' },
            { status: 500 }
        )
    }
}
