/**
 * FIX C2 — WRONG REDIRECT
 * Was: redirect('/dashboard/reports') — PROVIDER/HQ scoped, owner gets 401
 * Now: redirect('/dashboard/owner/reports-hub') — owner-scoped reports hub
 */
import { redirect } from 'next/navigation'

export default function OwnerReportsRedirect() {
    redirect('/dashboard/owner/reports-hub')
}
