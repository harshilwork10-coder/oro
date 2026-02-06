// Brand Theme Pack - Preset Themes
// Only preset themes allowed - no free color picker to ensure UI consistency

export type ThemeId =
    | 'classic_oro'      // Default gold
    | 'rose_gold'        // Upscale salons
    | 'blush_pink'       // Feminine, soft
    | 'lavender_night'   // Modern, trendy
    | 'mint_clean'       // Fresh, spa-like
    | 'ocean_blue'       // Cool, professional

export interface ThemeTokens {
    // Background colors
    bg: string              // Main background
    surface: string         // Card/panel surfaces
    surface2: string        // Elevated surfaces

    // Accent colors (these change per theme)
    accent: string          // Primary accent
    accentLight: string     // Lighter accent variant
    accentDark: string      // Darker accent variant
    accentMuted: string     // Muted/transparent accent

    // Text colors
    textPrimary: string     // Main text
    textSecondary: string   // Secondary text
    textMuted: string       // Muted text

    // Fixed colors - NEVER change per theme (accessibility)
    danger: string
    success: string
    warning: string
    info: string
}

export interface ThemePreset {
    id: ThemeId
    name: string
    description: string
    tokens: ThemeTokens
    preview: {
        accent: string
        bg: string
    }
}

// Fixed colors for accessibility - same across all themes
const FIXED_COLORS = {
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
}

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
    classic_oro: {
        id: 'classic_oro',
        name: 'Classic ORO',
        description: 'Default premium gold theme',
        preview: { accent: '#D4A843', bg: '#0A1628' },
        tokens: {
            bg: '#0A1628',
            surface: '#111827',
            surface2: '#1F2937',
            accent: '#D4A843',
            accentLight: '#E8C252',
            accentDark: '#B8922E',
            accentMuted: 'rgba(212, 168, 67, 0.15)',
            textPrimary: '#FFFFFF',
            textSecondary: '#D1D5DB',
            textMuted: '#9CA3AF',
            ...FIXED_COLORS,
        },
    },

    rose_gold: {
        id: 'rose_gold',
        name: 'Rose Gold',
        description: 'Elegant & upscale',
        preview: { accent: '#E8A4A4', bg: '#1A1A1A' },
        tokens: {
            bg: '#1A1415',
            surface: '#251D1E',
            surface2: '#302526',
            accent: '#E8A4A4',
            accentLight: '#F5C4C4',
            accentDark: '#C77878',
            accentMuted: 'rgba(232, 164, 164, 0.15)',
            textPrimary: '#FFF5F5',
            textSecondary: '#E8CECE',
            textMuted: '#A08888',
            ...FIXED_COLORS,
        },
    },

    blush_pink: {
        id: 'blush_pink',
        name: 'Blush Pink',
        description: 'Soft & feminine',
        preview: { accent: '#F5A8C5', bg: '#121212' },
        tokens: {
            bg: '#16111A',
            surface: '#201820',
            surface2: '#2A2028',
            accent: '#F5A8C5',
            accentLight: '#FFD4E5',
            accentDark: '#D87FA3',
            accentMuted: 'rgba(245, 168, 197, 0.15)',
            textPrimary: '#FFF8FB',
            textSecondary: '#E8D0DB',
            textMuted: '#A08090',
            ...FIXED_COLORS,
        },
    },

    lavender_night: {
        id: 'lavender_night',
        name: 'Lavender Night',
        description: 'Modern & trendy',
        preview: { accent: '#A78BFA', bg: '#0F0F1A' },
        tokens: {
            bg: '#0F0F1A',
            surface: '#1A1A2E',
            surface2: '#252542',
            accent: '#A78BFA',
            accentLight: '#C4B5FD',
            accentDark: '#7C5EB8',
            accentMuted: 'rgba(167, 139, 250, 0.15)',
            textPrimary: '#F8F6FF',
            textSecondary: '#D8D0F0',
            textMuted: '#8880A8',
            ...FIXED_COLORS,
        },
    },

    mint_clean: {
        id: 'mint_clean',
        name: 'Mint Clean',
        description: 'Fresh & spa-like',
        preview: { accent: '#34D399', bg: '#0A1F1F' },
        tokens: {
            bg: '#0A1815',
            surface: '#122420',
            surface2: '#1A2E28',
            accent: '#34D399',
            accentLight: '#6EE7B7',
            accentDark: '#10B981',
            accentMuted: 'rgba(52, 211, 153, 0.15)',
            textPrimary: '#F0FDF8',
            textSecondary: '#C8EAD8',
            textMuted: '#7AA898',
            ...FIXED_COLORS,
        },
    },

    ocean_blue: {
        id: 'ocean_blue',
        name: 'Ocean Blue',
        description: 'Cool & professional',
        preview: { accent: '#22D3EE', bg: '#0B1628' },
        tokens: {
            bg: '#0B1420',
            surface: '#112030',
            surface2: '#1A2A3E',
            accent: '#22D3EE',
            accentLight: '#67E8F9',
            accentDark: '#0891B2',
            accentMuted: 'rgba(34, 211, 238, 0.15)',
            textPrimary: '#F0FDFF',
            textSecondary: '#C8E8F0',
            textMuted: '#78A8B8',
            ...FIXED_COLORS,
        },
    },
}

// Get theme by ID (with fallback to default)
export function getTheme(themeId: ThemeId | string | null | undefined): ThemePreset {
    if (themeId && themeId in THEME_PRESETS) {
        return THEME_PRESETS[themeId as ThemeId]
    }
    return THEME_PRESETS.classic_oro
}

// Convert tokens to CSS variables
export function themeToCssVars(tokens: ThemeTokens): Record<string, string> {
    return {
        '--theme-bg': tokens.bg,
        '--theme-surface': tokens.surface,
        '--theme-surface2': tokens.surface2,
        '--theme-accent': tokens.accent,
        '--theme-accent-light': tokens.accentLight,
        '--theme-accent-dark': tokens.accentDark,
        '--theme-accent-muted': tokens.accentMuted,
        '--theme-text': tokens.textPrimary,
        '--theme-text-secondary': tokens.textSecondary,
        '--theme-text-muted': tokens.textMuted,
        '--theme-danger': tokens.danger,
        '--theme-success': tokens.success,
        '--theme-warning': tokens.warning,
        '--theme-info': tokens.info,
    }
}

// Apply theme to document
export function applyTheme(themeId: ThemeId | string | null | undefined): void {
    const theme = getTheme(themeId)
    const cssVars = themeToCssVars(theme.tokens)

    Object.entries(cssVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
    })

    // Store in localStorage for quick load
    if (typeof window !== 'undefined') {
        localStorage.setItem('selected_theme', theme.id)
    }
}

// Get all themes as array for UI
export function getAllThemes(): ThemePreset[] {
    return Object.values(THEME_PRESETS)
}

// High contrast mode (increases text contrast)
export function applyHighContrast(enabled: boolean): void {
    if (enabled) {
        document.documentElement.style.setProperty('--theme-text', '#FFFFFF')
        document.documentElement.style.setProperty('--theme-text-secondary', '#F3F4F6')
        document.documentElement.style.setProperty('--theme-text-muted', '#D1D5DB')
        document.documentElement.classList.add('high-contrast')
    } else {
        document.documentElement.classList.remove('high-contrast')
    }
}
