'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface SelectedAccount {
    id: string
    name: string
    type: 'franchisor' | 'franchise' | 'location'
    ownerId?: string
    industryType?: string
}

interface AccountContextType {
    selectedAccount: SelectedAccount | null
    setSelectedAccount: (account: SelectedAccount | null) => void
    clearAccount: () => void
    isAccountSelected: boolean
}

const AccountContext = createContext<AccountContextType | null>(null)

export function useAccountContext() {
    const context = useContext(AccountContext)
    if (!context) {
        throw new Error('useAccountContext must be used within AccountContextProvider')
    }
    return context
}

// Check if context is available (for components that may be outside provider)
export function useOptionalAccountContext() {
    return useContext(AccountContext)
}

interface Props {
    children: ReactNode
}

// Inner component: always rendered when account context IS needed — hooks are legal here
function AccountContextInner({ children }: Props) {
    const [selectedAccount, setSelectedAccount] = useState<SelectedAccount | null>(null)

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('selectedAccount')
        if (stored) {
            try {
                setSelectedAccount(JSON.parse(stored))
            } catch {
                localStorage.removeItem('selectedAccount')
            }
        }
    }, [])

    // Save to localStorage when changed
    useEffect(() => {
        if (selectedAccount) {
            localStorage.setItem('selectedAccount', JSON.stringify(selectedAccount))
        } else {
            localStorage.removeItem('selectedAccount')
        }
    }, [selectedAccount])

    const clearAccount = useCallback(() => {
        setSelectedAccount(null)
        localStorage.removeItem('selectedAccount')
    }, [])

    return (
        <AccountContext.Provider value={{
            selectedAccount,
            setSelectedAccount,
            clearAccount,
            isAccountSelected: selectedAccount !== null
        }}>
            {children}
        </AccountContext.Provider>
    )
}

// Outer component: checks session (no state/effect hooks) then conditionally renders inner
export function AccountContextProvider({ children }: Props) {
    const { data: session } = useSession()
    const userRole = (session?.user as { role?: string })?.role
    const needsAccountContext = userRole === 'PROVIDER' || userRole === 'SUPPORT_STAFF'

    // Only Provider and Support Staff need account context
    if (!needsAccountContext) {
        return <>{children}</>
    }

    return <AccountContextInner>{children}</AccountContextInner>
}

