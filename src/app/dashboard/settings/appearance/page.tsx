'use client'

import { useState } from 'react'
import { Check, Eye, Moon, Sun, Sparkles } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { getAllThemes, ThemeId, ThemePreset } from '@/lib/themes'

function ThemeCard({
    theme,
    selected,
    onSelect
}: {
    theme: ThemePreset
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            onClick={onSelect}
            className={`
        relative group p-4 rounded-2xl border-2 transition-all duration-300
        ${selected
                    ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-muted)] shadow-lg shadow-[var(--theme-accent)]/20'
                    : 'border-[var(--theme-surface2)] bg-[var(--theme-surface)] hover:border-[var(--theme-text-muted)] hover:bg-[var(--theme-surface2)]'
                }
      `}
        >
            {/* Preview */}
            <div
                className="w-full h-24 rounded-xl mb-3 relative overflow-hidden"
                style={{ backgroundColor: theme.preview.bg }}
            >
                {/* Accent bar */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-2"
                    style={{ backgroundColor: theme.preview.accent }}
                />
                {/* Accent circle */}
                <div
                    className="absolute top-4 left-4 w-8 h-8 rounded-full"
                    style={{ backgroundColor: theme.preview.accent }}
                />
                {/* Sample text lines */}
                <div className="absolute top-5 left-14 right-4 space-y-1.5">
                    <div className="h-2 w-3/4 bg-white/80 rounded" />
                    <div className="h-1.5 w-1/2 bg-white/40 rounded" />
                </div>
                {/* Sample button */}
                <div
                    className="absolute bottom-5 right-4 px-3 py-1 rounded text-xs font-bold text-black"
                    style={{ backgroundColor: theme.preview.accent }}
                >
                    Button
                </div>
            </div>

            {/* Info */}
            <div className="text-left">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[var(--theme-text)]">{theme.name}</h3>
                    {selected && (
                        <div className="w-5 h-5 rounded-full bg-[var(--theme-accent)] flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" />
                        </div>
                    )}
                </div>
                <p className="text-sm text-[var(--theme-text-muted)]">{theme.description}</p>
            </div>

            {/* Hover glow */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${theme.preview.accent}10 0%, transparent 70%)`
                }}
            />
        </button>
    )
}

export default function AppearanceSettingsPage() {
    const { themeId, setTheme, highContrast, setHighContrast } = useTheme()
    const themes = getAllThemes()
    const [applying, setApplying] = useState(false)

    const handleThemeChange = async (id: ThemeId) => {
        setApplying(true)
        await setTheme(id)
        setTimeout(() => setApplying(false), 300)
    }

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-[var(--theme-text)] flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-[var(--theme-accent)]" />
                        Appearance
                    </h1>
                    <p className="text-[var(--theme-text-muted)] mt-1">
                        Customize your POS with a theme that matches your brand
                    </p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--theme-text)]">Choose Your Theme</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {themes.map((theme) => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                selected={themeId === theme.id}
                                onSelect={() => handleThemeChange(theme.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Accessibility */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--theme-text)]">Accessibility</h2>

                    <div className="bg-[var(--theme-surface)] rounded-2xl p-6 border border-[var(--theme-surface2)]">
                        <button
                            onClick={() => setHighContrast(!highContrast)}
                            className="w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all
                  ${highContrast
                                        ? 'bg-[var(--theme-accent)] text-black'
                                        : 'bg-[var(--theme-surface2)] text-[var(--theme-text-muted)] group-hover:bg-[var(--theme-surface2)]'
                                    }
                `}>
                                    {highContrast ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-[var(--theme-text)]">High Contrast Mode</h3>
                                    <p className="text-sm text-[var(--theme-text-muted)]">
                                        Increased text visibility for better readability
                                    </p>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <div className={`
                w-14 h-8 rounded-full p-1 transition-all
                ${highContrast ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-surface2)]'}
              `}>
                                <div className={`
                  w-6 h-6 rounded-full bg-white shadow-md transition-transform
                  ${highContrast ? 'translate-x-6' : 'translate-x-0'}
                `} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[var(--theme-text)]">Live Preview</h2>

                    <div className="bg-[var(--theme-surface)] rounded-2xl p-6 border border-[var(--theme-surface2)] space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[var(--theme-accent)] flex items-center justify-center">
                                <Eye className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--theme-text)]">Sample Product</h3>
                                <p className="text-sm text-[var(--theme-text-muted)]">This is how items will look</p>
                            </div>
                            <div className="ml-auto text-right">
                                <span className="text-lg font-bold text-[var(--theme-accent)]">$24.99</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 px-4 bg-[var(--theme-accent)] text-black font-bold rounded-xl hover:opacity-90 transition-opacity">
                                Primary Button
                            </button>
                            <button className="flex-1 py-3 px-4 bg-[var(--theme-surface2)] text-[var(--theme-text)] font-medium rounded-xl border border-[var(--theme-text-muted)]/30 hover:bg-[var(--theme-accent-muted)] transition-colors">
                                Secondary
                            </button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--theme-success)]/20 text-[var(--theme-success)]">Success</span>
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--theme-warning)]/20 text-[var(--theme-warning)]">Warning</span>
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--theme-danger)]/20 text-[var(--theme-danger)]">Error</span>
                        </div>
                    </div>
                </div>

                {/* Save indicator */}
                {applying && (
                    <div className="fixed bottom-6 right-6 bg-[var(--theme-accent)] text-black px-6 py-3 rounded-full font-semibold shadow-lg animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Theme Applied!
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
