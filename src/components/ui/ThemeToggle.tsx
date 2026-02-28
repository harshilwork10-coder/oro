'use client'

/**
 * Theme Toggle — Dark/Light mode (zero API calls)
 *
 * Persists preference in localStorage.
 * Uses CSS custom properties for instant switching.
 */

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'dark' | 'light' | 'system'

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('dark')

    useEffect(() => {
        const saved = localStorage.getItem('oro9-theme') as Theme
        if (saved) setTheme(saved)
    }, [])

    useEffect(() => {
        const root = document.documentElement
        const effectiveTheme = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme

        root.classList.remove('dark', 'light')
        root.classList.add(effectiveTheme)
        root.style.colorScheme = effectiveTheme
        localStorage.setItem('oro9-theme', theme)
    }, [theme])

    const next = () => {
        const order: Theme[] = ['dark', 'light', 'system']
        const idx = order.indexOf(theme)
        setTheme(order[(idx + 1) % order.length])
    }

    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
    const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

    return (
        <button onClick={next} className="flex items-center gap-2 px-3 py-2 hover:bg-stone-800 rounded-lg text-sm text-stone-400" title={`Theme: ${label}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    )
}

/**
 * CSS custom properties for light mode support
 * Add to your global CSS:
 *
 * :root { --bg-primary: #0c0a09; --text-primary: #fff; }
 * .light { --bg-primary: #fafaf9; --text-primary: #1c1917; }
 */
