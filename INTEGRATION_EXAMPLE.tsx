/**
 * INTEGRATION GUIDE: CheckoutModal + TipModal + ReviewModal
 * =========================================================
 * 
 * This example shows how to wire up the CheckoutModal with the customer display
 * tip and review modals in your POS page component.
 */

import { useState } from 'react'
import CheckoutModal from '@/components/pos/CheckoutModal'
import CustomerDisplay from '@/components/kiosk/CustomerDisplay'

export default function POSPage() {
    const [showCheckout, setShowCheckout] = useState(false)
    const [showTipModal, setShowTipModal] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [currentTip, setCurrentTip] = useState(0)

    // Your cart state
    const [cart, setCart] = useState({
        items: [],
        subtotal: 0,
        customerName: '',
        customerId: ''
    })

    // Handle tip selected from customer display
    const handleTipSelected = (tipAmount: number) => {
        setCurrentTip(tipAmount)
        setShowTipModal(false)
        // CheckoutModal will continue processing
    }

    // Handle review submission
    const handleReviewSubmit = async (rating: number, feedbackTag: string | null) => {
        try {
            await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: cart.customerId,
                    rating,
                    feedbackTag,
                })
            })
        } catch (error) {
            console.error('Failed to submit review:', error)
        }
    }

    // Handle transaction completion
    const handleTransactionComplete = (transaction: any) => {
        console.log('Transaction completed:', transaction)
        // Save to database, print receipt, etc.
        setShowCheckout(false)
        // Reset cart
        setCart({ items: [], subtotal: 0, customerName: '', customerId: '' })
    }

    return (
        <div>
            {/* POS Interface */}
            <div>{/* Your POS UI */}</div>

            {/* Customer Display */}
            <CustomerDisplay
                cart={cart}
                showTipModal={showTipModal}
                onTipSelected={handleTipSelected}
                onTipModalClose={() => setShowTipModal(false)}
                showReviewModal={showReviewModal}
                onReviewSubmit={handleReviewSubmit}
                onReviewSkip={() => setShowReviewModal(false)}
            />

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cart={cart.items}
                subtotal={cart.subtotal}
                taxRate={0.08}
                customerId={cart.customerId}
                customerName={cart.customerName}
                onComplete={handleTransactionComplete}
                onShowTipModal={setShowTipModal}
                onShowReviewModal={setShowReviewModal}
                onTipSelected={setCurrentTip}
                onReviewSubmit={handleReviewSubmit}
            />
        </div>
    )
}
