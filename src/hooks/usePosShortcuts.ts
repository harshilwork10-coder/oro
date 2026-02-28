/**
 * POS Keyboard Shortcuts — Zero API calls
 *
 * F1-F12 shortcuts for high-speed checkout operations.
 * Attach to POS checkout screen to enable power-user mode.
 */

'use client'

import { useEffect, useCallback } from 'react'

interface PosShortcutActions {
    onVoidItem?: () => void          // F1
    onDiscount?: () => void          // F2
    onPriceCheck?: () => void        // F3
    onCustomer?: () => void          // F4
    onSplitTender?: () => void       // F5
    onHoldTransaction?: () => void   // F6
    onRecallHeld?: () => void        // F7
    onOpenDrawer?: () => void        // F8
    onRefund?: () => void            // F9
    onNoSale?: () => void            // F10
    onReprintReceipt?: () => void    // F11
    onEndShift?: () => void          // F12
    onQuickCash?: (amount: number) => void  // numpad shortcuts
}

export function usePosShortcuts(actions: PosShortcutActions, enabled = true) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return

        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

        switch (e.key) {
            case 'F1': e.preventDefault(); actions.onVoidItem?.(); break
            case 'F2': e.preventDefault(); actions.onDiscount?.(); break
            case 'F3': e.preventDefault(); actions.onPriceCheck?.(); break
            case 'F4': e.preventDefault(); actions.onCustomer?.(); break
            case 'F5': e.preventDefault(); actions.onSplitTender?.(); break
            case 'F6': e.preventDefault(); actions.onHoldTransaction?.(); break
            case 'F7': e.preventDefault(); actions.onRecallHeld?.(); break
            case 'F8': e.preventDefault(); actions.onOpenDrawer?.(); break
            case 'F9': e.preventDefault(); actions.onRefund?.(); break
            case 'F10': e.preventDefault(); actions.onNoSale?.(); break
            case 'F11': e.preventDefault(); actions.onReprintReceipt?.(); break
            case 'F12': e.preventDefault(); actions.onEndShift?.(); break
        }
    }, [enabled, actions])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

/** Shortcut reference overlay for training */
export const SHORTCUT_MAP = [
    { key: 'F1', action: 'Void Item', color: 'text-red-400' },
    { key: 'F2', action: 'Apply Discount', color: 'text-amber-400' },
    { key: 'F3', action: 'Price Check', color: 'text-blue-400' },
    { key: 'F4', action: 'Customer Lookup', color: 'text-purple-400' },
    { key: 'F5', action: 'Split Tender', color: 'text-cyan-400' },
    { key: 'F6', action: 'Hold Transaction', color: 'text-orange-400' },
    { key: 'F7', action: 'Recall Held', color: 'text-emerald-400' },
    { key: 'F8', action: 'Open Drawer', color: 'text-pink-400' },
    { key: 'F9', action: 'Refund', color: 'text-red-400' },
    { key: 'F10', action: 'No Sale', color: 'text-stone-400' },
    { key: 'F11', action: 'Reprint Receipt', color: 'text-stone-400' },
    { key: 'F12', action: 'End Shift', color: 'text-amber-400' },
]

export default usePosShortcuts
