import { Suspense } from 'react';
import NewRequestForm from './NewRequestForm';

export default function NewRequestPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewRequestForm />
        </Suspense>
    );
}
