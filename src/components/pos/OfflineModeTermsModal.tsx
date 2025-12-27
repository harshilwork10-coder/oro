'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Check, FileText } from 'lucide-react';

interface OfflineModeTermsProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
    storeName: string;
    ownerName: string;
}

export function OfflineModeTermsModal({
    isOpen,
    onAccept,
    onDecline,
    storeName,
    ownerName
}: OfflineModeTermsProps) {
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);

    if (!isOpen) return null;

    const handleAccept = () => {
        if (agreedToTerms && acknowledgedRisks) {
            // Log acceptance
            logTermsAcceptance();
            onAccept();
        }
    };

    const logTermsAcceptance = async () => {
        try {
            await fetch('/api/audit/offline-terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'OFFLINE_TERMS_ACCEPTED',
                    storeName,
                    ownerName,
                    timestamp: new Date().toISOString(),
                    termsVersion: '1.0'
                })
            });
        } catch (e) {
            console.log('[OfflineTerms] Could not log acceptance (offline)');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-stone-700">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Shield className="h-7 w-7 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Offline Mode Terms of Use</h2>
                            <p className="text-stone-400">Required before enabling offline transactions</p>
                        </div>
                    </div>
                </div>

                {/* Terms Content */}
                <div className="p-6">
                    <div className="bg-stone-950 p-6 rounded-xl border border-stone-700 max-h-96 overflow-y-auto space-y-4 text-sm text-stone-300">
                        <h3 className="font-bold text-lg text-white">OFFLINE TRANSACTION FEATURE TERMS</h3>

                        <p>By enabling the Offline Transaction feature, you (<strong>{storeName}</strong>, represented by <strong>{ownerName}</strong>) agree to the following terms:</p>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-white">1. ASSUMPTION OF RISK</h4>
                                <p>You acknowledge and agree that:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Offline card transactions carry inherent risks including but not limited to declined cards, fraudulent transactions, and chargebacks.</li>
                                    <li>You are solely responsible for any losses resulting from offline transactions.</li>
                                    <li>You will not hold the POS Provider liable for any declined payments, chargebacks, or fraudulent transactions processed offline.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-white">2. MERCHANT RESPONSIBILITY</h4>
                                <p>As the merchant, you agree to:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Collect customer authorization (signature and contact information) for all offline card transactions using the provided waiver form.</li>
                                    <li>Retain records of all offline transactions and customer waivers for a minimum of 2 years.</li>
                                    <li>Pursue customers directly for any declined offline payments; the POS Provider will not assist in collection efforts.</li>
                                    <li>Train employees on proper offline transaction procedures.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-white">3. PROVIDER LIMITATIONS</h4>
                                <p>The POS Provider:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Makes no guarantee that offline transactions will be successfully processed when connectivity returns.</li>
                                    <li>Is not responsible for data loss if the device is damaged before syncing.</li>
                                    <li>Provides the offline feature "as-is" without warranty of any kind.</li>
                                    <li>Reserves the right to disable offline features at any time.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-white">4. INDEMNIFICATION</h4>
                                <p>You agree to indemnify, defend, and hold harmless the POS Provider, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the offline transaction feature.</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-white">5. RECOMMENDED LIMITS</h4>
                                <p>While not required, we strongly recommend:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Setting a maximum transaction amount for offline payments (e.g., $100)</li>
                                    <li>Limiting offline card payments to trusted/known customers</li>
                                    <li>Preferring cash payments when possible during offline periods</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-stone-500 mt-4">
                            Version 1.0 | Effective Date: {new Date().toLocaleDateString()} | By clicking "Accept", you acknowledge you have read, understood, and agree to these terms.
                        </p>
                    </div>

                    {/* Checkboxes */}
                    <div className="mt-6 space-y-3">
                        <label className="flex items-start gap-3 p-4 bg-stone-800 rounded-lg cursor-pointer hover:bg-stone-750">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="h-5 w-5 rounded mt-0.5"
                            />
                            <span className="text-sm">
                                I have read, understand, and agree to the Offline Transaction Feature Terms above.
                            </span>
                        </label>

                        <label className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acknowledgedRisks}
                                onChange={(e) => setAcknowledgedRisks(e.target.checked)}
                                className="h-5 w-5 rounded mt-0.5"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                                    <AlertTriangle className="h-4 w-4" />
                                    Risk Acknowledgment
                                </div>
                                <span className="text-sm text-stone-300 mt-1 block">
                                    I understand that offline card transactions may fail and I accept full financial responsibility for any losses.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={onDecline}
                            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-lg font-medium"
                        >
                            Decline (Cash Only Mode)
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={!agreedToTerms || !acknowledgedRisks}
                            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-stone-700 disabled:text-stone-500 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                            <Check className="h-5 w-5" />
                            Accept Terms
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
