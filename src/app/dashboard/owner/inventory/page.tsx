import { redirect } from 'next/navigation'

export default function OwnerInventoryRedirect() {
    redirect('/dashboard/inventory/retail')
}
