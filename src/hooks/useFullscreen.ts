import { useState, useEffect, useCallback } from 'react'

interface UseFullscreenReturn {
    isFullscreen: boolean
    enterFullscreen: () => Promise<void>
    exitFullscreen: () => Promise<void>
    toggleFullscreen: () => Promise<void>
    isSupported: boolean
}

/**
 * React hook for managing fullscreen mode
 * Compatible with all major browsers
 */
export function useFullscreen(): UseFullscreenReturn {
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Check if fullscreen API is supported
    const isSupported = typeof document !== 'undefined' && (
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).mozFullScreenEnabled ||
        (document as any).msFullscreenEnabled
    )

    // Update state when fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreenElement =
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement

            setIsFullscreen(!!fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.addEventListener('mozfullscreenchange', handleFullscreenChange)
        document.addEventListener('MSFullscreenChange', handleFullscreenChange)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
        }
    }, [])

    const enterFullscreen = useCallback(async () => {
        if (!isSupported) {
            console.warn('Fullscreen API is not supported')
            return
        }

        try {
            const elem = document.documentElement

            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            } else if ((elem as any).webkitRequestFullscreen) {
                await (elem as any).webkitRequestFullscreen()
            } else if ((elem as any).mozRequestFullScreen) {
                await (elem as any).mozRequestFullScreen()
            } else if ((elem as any).msRequestFullscreen) {
                await (elem as any).msRequestFullscreen()
            }
        } catch (error) {
            console.error('Error entering fullscreen:', error)
        }
    }, [isSupported])

    const exitFullscreen = useCallback(async () => {
        if (!isSupported) return

        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen()
            } else if ((document as any).mozCancelFullScreen) {
                await (document as any).mozCancelFullScreen()
            } else if ((document as any).msExitFullscreen) {
                await (document as any).msExitFullscreen()
            }
        } catch (error) {
            console.error('Error exiting fullscreen:', error)
        }
    }, [isSupported])

    const toggleFullscreen = useCallback(async () => {
        if (isFullscreen) {
            await exitFullscreen()
        } else {
            await enterFullscreen()
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen])

    return {
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        isSupported
    }
}
