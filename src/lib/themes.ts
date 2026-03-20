// Brand Theme Pack - Preset Themes
// Only preset themes allowed - no free color picker to ensure UI consistency

export type ThemeId =
    | 'oro_orange'       // Original ORO orange
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
    oro_orange: {
        id: 'oro_orange',
        name: 'ORO Orange',
        description: 'Original ORO signature theme',
        preview: { accent: '#FF6B00', bg: '#1A0F0A' },
        tokens: {
            bg: '#1A0F0A',
            surface: '#261810',
            surface2: '#352218',
            accent: '#FF6B00',
            accentLight: '#FF8C38',
            accentDark: '#E85D00',
            accentMuted: 'rgba(255, 107, 0, 0.20)',
            textPrimary: '#FFFAF5',
            textSecondary: '#EDD5B8',
            textMuted: '#B89070',
            ...FIXED_COLORS,
        },
    },

    classic_oro: {
        id: 'classic_oro',
        name: 'Classic ORO',
        description: 'Default premium gold theme',
        preview: { accent: '#FFB800', bg: '#08132A' },
        tokens: {
            bg: '#08132A',
            surface: '#0F1D36',
            surface2: '#1A2D48',
            accent: '#FFB800',
            accentLight: '#FFCF40',
            accentDark: '#E0A000',
            accentMuted: 'rgba(255, 184, 0, 0.20)',
            textPrimary: '#FFFFFF',
            textSecondary: '#D6DCE8',
            textMuted: '#A0AABB',
            ...FIXED_COLORS,
        },
    },

    rose_gold: {
        id: 'rose_gold',
        name: 'Rose Gold',
        description: 'Elegant & upscale',
        preview: { accent: '#F06565', bg: '#1A1214' },
        tokens: {
            bg: '#1A1214',
            surface: '#281C1E',
            surface2: '#352628',
            accent: '#F06565',
            accentLight: '#FF8A8A',
            accentDark: '#D44545',
            accentMuted: 'rgba(240, 101, 101, 0.20)',
            textPrimary: '#FFF5F5',
            textSecondary: '#EBCFCF',
            textMuted: '#B08888',
            ...FIXED_COLORS,
        },
    },

    blush_pink: {
        id: 'blush_pink',
        name: 'Blush Pink',
        description: 'Bold & feminine',
        preview: { accent: '#EC4899', bg: '#150E1A' },
        tokens: {
            bg: '#150E1A',
            surface: '#201622',
            surface2: '#2E1F30',
            accent: '#EC4899',
            accentLight: '#FF70B8',
            accentDark: '#D03080',
            accentMuted: 'rgba(236, 72, 153, 0.20)',
            textPrimary: '#FFF5FA',
            textSecondary: '#E8CED8',
            textMuted: '#B08898',
            ...FIXED_COLORS,
        },
    },

    lavender_night: {
        id: 'lavender_night',
        name: 'Lavender Night',
        description: 'Modern & trendy',
        preview: { accent: '#8B5CF6', bg: '#0E0E1C' },
        tokens: {
            bg: '#0E0E1C',
            surface: '#181830',
            surface2: '#222246',
            accent: '#8B5CF6',
            accentLight: '#A78BFA',
            accentDark: '#7040E0',
            accentMuted: 'rgba(139, 92, 246, 0.20)',
            textPrimary: '#F8F6FF',
            textSecondary: '#D4CCF0',
            textMuted: '#9088B8',
            ...FIXED_COLORS,
        },
    },

    mint_clean: {
        id: 'mint_clean',
        name: 'Mint Clean',
        description: 'Fresh & spa-like',
        preview: { accent: '#10D98A', bg: '#081A15' },
        tokens: {
            bg: '#081A15',
            surface: '#0F2820',
            surface2: '#18352C',
            accent: '#10D98A',
            accentLight: '#50F0AA',
            accentDark: '#08C070',
            accentMuted: 'rgba(16, 217, 138, 0.20)',
            textPrimary: '#F0FEF8',
            textSecondary: '#C0ECDA',
            textMuted: '#70B89A',
            ...FIXED_COLORS,
        },
    },

    ocean_blue: {
        id: 'ocean_blue',
        name: 'Ocean Blue',
        description: 'Cool & professional',
        preview: { accent: '#00D4FF', bg: '#0A1222' },
        tokens: {
            bg: '#0A1222',
            surface: '#0F1D32',
            surface2: '#182C42',
            accent: '#00D4FF',
            accentLight: '#40E8FF',
            accentDark: '#00A8D0',
            accentMuted: 'rgba(0, 212, 255, 0.20)',
            textPrimary: '#F0FDFF',
            textSecondary: '#C0E4F0',
            textMuted: '#70A8C0',
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
