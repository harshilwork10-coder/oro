/**
 * FIX C3 — WRONG REDIRECT
 * Was: redirect('/dashboard') — generic dashboard, wrong context for OWNER role
 * Now: redirect('/dashboard/owner') — canonical owner command center
 */
import { redirect } from 'next/navigation'

export default function OwnerHomeRedirect() {
    redirect('/dashboard/owner')
}
