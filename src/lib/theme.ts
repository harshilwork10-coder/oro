/**
 * Oronex POS - Eye-Friendly Color System
 * Optimized for 8+ hour daily use with reduced eye strain
 */

export const colors = {
    // Backgrounds - Warm, soft off-white (not pure white)
    background: {
        primary: '#F8F9FA',    // Main background - warm off-white
        surface: '#FFFFFF',     // Cards, modals
        overlay: '#00000080',   // Semi-transparent overlays
    },

    // Brand Colors - Muted for eye comfort
    brand: {
        purple: '#9D7DD9',      // Primary brand color (muted violet)
        blue: '#5B9FE3',        // Secondary brand color (muted blue)
        accent: '#F59E0B',      // Warm amber accent
    },

    // Text - Soft blacks and grays (not pure black)
    text: {
        primary: '#1F2937',     // Soft black for main text
        secondary: '#6B7280',   // Medium gray for secondary text
        muted: '#9CA3AF',       // Light gray for hints
        inverse: '#FFFFFF',     // White text on dark backgrounds
    },

    // Semantic Colors
    status: {
        success: '#10B981',     // Emerald green
        warning: '#F59E0B',     // Amber
        error: '#EF4444',       // Rose red
        info: '#3B82F6',        // Blue
    },

    // Borders and Dividers
    border: {
        light: '#E5E7EB',       // Light gray borders
        medium: '#D1D5DB',      // Medium gray borders
        dark: '#9CA3AF',        // Darker borders
    },

    // Shadows - Subtle, no harsh glows
    shadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 1px 3px rgba(0, 0, 0, 0.1)',
        lg: '0 4px 6px rgba(0, 0, 0, 0.1)',
        xl: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },

    // Dark Mode (Optional - for evening shifts)
    dark: {
        background: '#1A1D23',  // Warm dark, not pure black
        surface: '#242831',     // Cards in dark mode
        text: {
            primary: '#E5E7EB',   // Soft white
            secondary: '#9CA3AF', // Gray
        },
        brand: {
            purple: '#A78BFA',    // Lighter for dark bg
            blue: '#60A5FA',      // Lighter for dark bg
        },
    },
}

// Gradient utilities (use sparingly - only for logos/accents)
export const gradients = {
    brand: 'linear-gradient(135deg, #9D7DD9, #5B9FE3)',
    brandSubtle: 'linear-gradient(to-br, #F3F4F6, #E0E7FF)',
}

// Typography scale
export const typography = {
    fontSize: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px (minimum for body text)
        base: '1rem',     // 16px (default body)
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
    },
    lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.6',  // Default for body text
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600', // Max for headers
    },
}

// Border radius
export const borderRadius = {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
}

// Spacing scale
export const spacing = {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
}
