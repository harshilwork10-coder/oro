'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-stone-950 text-stone-200">
            {/* Sidebar (Desktop & Mobile) */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Mobile Header (Hamburger) */}
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
