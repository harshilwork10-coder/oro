'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { t as translate, Language } from './translations';

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
    isSpanish: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: 'en',
    setLang: () => { },
    t: (key: string) => key,
    isSpanish: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('oro9_language') as Language) || 'en';
        }
        return 'en';
    });

    const setLang = useCallback((newLang: Language) => {
        setLangState(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('oro9_language', newLang);
        }
    }, []);

    const t = useCallback((key: string) => translate(key, lang), [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, isSpanish: lang === 'es' }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

/**
 * Language Toggle Component — drop into any page
 * 
 * Usage: <LanguageToggle />
 */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
    const { lang, setLang } = useLanguage();

    if (compact) {
        return (
            <button
                onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium transition-colors"
                title={lang === 'en' ? 'Switch to Spanish' : 'Switch to English'}
            >
                {lang === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5">
            <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lang === 'en'
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-400 hover:text-white'
                    }`}
            >
                🇺🇸 English
            </button>
            <button
                onClick={() => setLang('es')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lang === 'es'
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-400 hover:text-white'
                    }`}
            >
                🇪🇸 Español
            </button>
        </div>
    );
}

export default LanguageProvider;
