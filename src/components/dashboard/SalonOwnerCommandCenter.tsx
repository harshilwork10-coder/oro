'use client'

// SalonOwnerCommandCenter now routes to the new shared owner OS
// This preserves backward compatibility with /dashboard/owner which imports this component
import MultiLocationOwnerOS from './owner-os/MultiLocationOwnerOS'

export default function SalonOwnerCommandCenter() {
    return <MultiLocationOwnerOS />
}
