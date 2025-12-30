'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

export function AccountContextProvider({ children }: Props) {
    const { data: session } = useSession()
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

    const clearAccount = () => {
        setSelectedAccount(null)
        localStorage.removeItem('selectedAccount')
    }

    // Only Provider and Support Staff need account context
    const userRole = (session?.user as any)?.role
    const needsAccountContext = userRole === 'PROVIDER' || userRole === 'SUPPORT_STAFF'

    // If user doesn't need account context, just render children
    if (!needsAccountContext) {
        return <>{children}</>
    }

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

