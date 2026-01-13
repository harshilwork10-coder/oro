import { redirect } from 'next/navigation';

// Employee root redirects to My Reports (personal dashboard)
// This is the landing page for employees logging in via Phone + PIN
export default function EmployeePage() {
    redirect('/employee/my-reports');
}


