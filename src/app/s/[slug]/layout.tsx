import { Metadata } from 'next';
import './storefront.css';

export const metadata: Metadata = {
    title: 'Store | ORO 9',
    description: 'Browse products and place a pickup order',
};

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="sf-root">
            {children}
            {/* Footer */}
            <footer className="sf-footer">
                <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-400">
                    <span>Powered by <strong className="text-orange-500">ORO 9</strong></span>
                    <span>© {new Date().getFullYear()}</span>
                </div>
            </footer>
        </div>
    );
}
