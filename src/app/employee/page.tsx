import { redirect } from 'next/navigation';

// Employee root redirects to Check-In (Salon) or POS (Retail)
// In real app, would check user's business type
export default function EmployeePage() {
    // Default to check-in for demo (salon first)
    redirect('/employee/check-in');
}

