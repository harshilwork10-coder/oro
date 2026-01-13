'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddFranchisorModal from '@/components/modals/AddFranchisorModal';

export default function NewClientPage() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(true);

    const handleClose = () => {
        setIsModalOpen(false);
        router.push('/provider/onboarding');
    };

    const handleSuccess = () => {
        // Modal will show magic link, don't close automatically
        // User can close manually or we redirect after they're done
    };

    return (
        <div className="min-h-screen">
            <AddFranchisorModal
                isOpen={isModalOpen}
                onClose={handleClose}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
