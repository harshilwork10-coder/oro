import { redirect } from 'next/navigation'

export default function InventoryTransfersRedirect() {
    redirect('/dashboard/owner/transfers')
}
