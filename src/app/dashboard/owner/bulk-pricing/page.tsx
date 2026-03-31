import { redirect } from 'next/navigation'

export default function OwnerBulkPricingRedirect() {
    redirect('/dashboard/inventory/bulk-price-update')
}
