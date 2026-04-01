/**
 * FIX C5 — VERTICAL GUARD
 * /dashboard/owner/salon does NOT belong in the retail owner portal.
 * The salon owner dashboard lives at /owner (vertical-aware sidebar layout).
 * Redirect retail owners who land here to the correct owner home.
 */
import { redirect } from 'next/navigation'

export default function SalonInRetailPortalGuard() {
    redirect('/dashboard/owner')
}
