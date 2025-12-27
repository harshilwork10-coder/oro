'use client';

import { useState, useRef } from 'react';
import { AlertTriangle, X, CheckCircle, FileText, Phone, Mail } from 'lucide-react';

interface OfflineCardWaiverProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (customerInfo: CustomerInfo) => void;
    amount: number;
    storeName: string;
}

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    signature: string;
    agreedAt: Date;
    ipAddress?: string;
}

export function OfflineCardWaiverModal({
    isOpen,
    onClose,
    onAccept,
    amount,
    storeName
}: OfflineCardWaiverProps) {
    const [step, setStep] = useState<'info' | 'waiver' | 'signature'>('info');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [signature, setSignature] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!customerName || !customerPhone || !agreedToTerms || !signature) return;

        onAccept({
            name: customerName,
            phone: customerPhone,
            email: customerEmail || undefined,
            signature,
            agreedAt: new Date()
        });
    };

    // Simple signature drawing
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            setSignature(canvas.toDataURL());
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setSignature('');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Offline Payment Authorization</h2>
                            <p className="text-amber-400 text-sm">Card will be charged when internet returns</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Amount */}
                <div className="p-6 bg-stone-800/50 border-b border-stone-700">
                    <div className="text-center">
                        <div className="text-stone-400 text-sm">Amount to Authorize</div>
                        <div className="text-4xl font-bold text-white">${amount.toFixed(2)}</div>
                    </div>
                </div>

                {/* Step 1: Customer Info */}
                {step === 'info' && (
                    <div className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Customer Information</h3>

                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Full Name *</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="John Smith"
                                className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-lg focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Phone Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                    className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-lg focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Email (Optional)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="john@email.com"
                                    className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-lg focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('waiver')}
                            disabled={!customerName || !customerPhone}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 rounded-lg font-semibold"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 2: Waiver Terms */}
                {step === 'waiver' && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-amber-400" />
                            <h3 className="font-semibold text-lg">Payment Authorization Agreement</h3>
                        </div>

                        <div className="bg-stone-950 p-4 rounded-lg border border-stone-700 max-h-64 overflow-y-auto text-sm text-stone-300 space-y-3">
                            <p><strong>OFFLINE CARD PAYMENT AUTHORIZATION</strong></p>

                            <p>I, <strong>{customerName}</strong>, hereby authorize <strong>{storeName}</strong> to charge my credit/debit card in the amount of <strong>${amount.toFixed(2)}</strong> for goods and/or services received today.</p>

                            <p><strong>I understand and agree that:</strong></p>

                            <ol className="list-decimal pl-5 space-y-2">
                                <li>Due to temporary network connectivity issues, my card cannot be processed immediately.</li>
                                <li>My card will be charged when network connectivity is restored, which may be later today or within the next few business days.</li>
                                <li>I am taking possession of the goods/services immediately upon signing this authorization.</li>
                                <li>If my card payment is declined when processed, I agree to make immediate alternative payment arrangements.</li>
                                <li>I may be charged the authorized amount plus any applicable declined payment fees as permitted by law.</li>
                                <li>This signed authorization serves as proof of my agreement to this transaction.</li>
                            </ol>

                            <p><strong>Contact Information Provided:</strong><br />
                                Name: {customerName}<br />
                                Phone: {customerPhone}<br />
                                {customerEmail && `Email: ${customerEmail}`}</p>

                            <p className="text-xs text-stone-500">
                                This authorization is valid for 30 days from the date of signing. If payment cannot be collected within this period, the merchant reserves the right to pursue collection through available legal means.
                            </p>
                        </div>

                        <label className="flex items-start gap-3 p-3 bg-stone-800 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="h-5 w-5 rounded mt-0.5"
                            />
                            <span className="text-sm">
                                I have read and agree to the Payment Authorization Agreement above. I understand my card will be charged later.
                            </span>
                        </label>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('info')}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-lg"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep('signature')}
                                disabled={!agreedToTerms}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 rounded-lg font-semibold"
                            >
                                Sign Authorization
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Signature */}
                {step === 'signature' && (
                    <div className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg mb-4">Customer Signature</h3>

                        <p className="text-sm text-stone-400">
                            Please sign in the box below using your finger or stylus:
                        </p>

                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={150}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full bg-white rounded-lg border-2 border-stone-600 cursor-crosshair touch-none"
                                style={{ touchAction: 'none' }}
                            />
                            {!signature && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-stone-400 text-sm">Sign here</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={clearSignature}
                            className="text-sm text-amber-400 hover:text-amber-300"
                        >
                            Clear Signature
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('waiver')}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-lg"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!signature}
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-700 disabled:text-stone-500 rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="h-5 w-5" />
                                Complete Authorization
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
