'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeId, getTheme, applyTheme, applyHighContrast, THEME_PRESETS } from '@/lib/themes'

interface ThemeContextType {
    themeId: ThemeId
    setTheme: (id: ThemeId) => void
    highContrast: boolean
    setHighContrast: (enabled: boolean) => void
    isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}

interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: ThemeId
}

export function ThemeProvider({ children, defaultTheme = 'classic_oro' }: ThemeProviderProps) {
    const [themeId, setThemeId] = useState<ThemeId>(defaultTheme)
    const [highContrast, setHighContrastState] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Load saved theme on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                // First check localStorage for instant load
                const savedTheme = localStorage.getItem('selected_theme') as ThemeId | null
                const savedContrast = localStorage.getItem('high_contrast') === 'true'

                if (savedTheme && savedTheme in THEME_PRESETS) {
                    setThemeId(savedTheme)
                    applyTheme(savedTheme)
                } else {
                    applyTheme(defaultTheme)
                }

                if (savedContrast) {
                    setHighContrastState(true)
                    applyHighContrast(true)
                }

                // Then try to load from server settings
                const res = await fetch('/api/settings/theme')
                if (res.ok) {
                    const data = await res.json()
                    if (data.themeId && data.themeId in THEME_PRESETS) {
                        setThemeId(data.themeId)
                        applyTheme(data.themeId)
                        localStorage.setItem('selected_theme', data.themeId)
                    }
                    if (typeof data.highContrast === 'boolean') {
                        setHighContrastState(data.highContrast)
                        applyHighContrast(data.highContrast)
                        localStorage.setItem('high_contrast', String(data.highContrast))
                    }
                }
            } catch (e) {
                console.error('Error loading theme:', e)
                applyTheme(defaultTheme)
            } finally {
                setIsLoading(false)
            }
        }

        loadTheme()
    }, [defaultTheme])

    const setTheme = async (id: ThemeId) => {
        setThemeId(id)
        applyTheme(id)
        localStorage.setItem('selected_theme', id)

        // Save to server
        try {
            await fetch('/api/settings/theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themeId: id }),
            })
        } catch (e) {
            console.error('Error saving theme:', e)
        }
    }

    const setHighContrast = async (enabled: boolean) => {
        setHighContrastState(enabled)
        applyHighContrast(enabled)
        localStorage.setItem('high_contrast', String(enabled))

        // Save to server
        try {
            await fetch('/api/settings/theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ highContrast: enabled }),
            })
        } catch (e) {
            console.error('Error saving high contrast:', e)
        }
    }

    return (
        <ThemeContext.Provider value={{ themeId, setTheme, highContrast, setHighContrast, isLoading }}>
            {children}
        </ThemeContext.Provider>
    )
}
