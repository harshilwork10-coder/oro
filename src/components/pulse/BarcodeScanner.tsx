'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Flashlight, FlashlightOff } from 'lucide-react'

interface BarcodeScannerProps {
    onScan: (barcode: string) => void
    onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [torchOn, setTorchOn] = useState(false)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })

            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
                setScanning(true)
                // Start scanning loop
                requestAnimationFrame(scanFrame)
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError('Unable to access camera. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
        }
        setScanning(false)
    }

    const toggleTorch = async () => {
        if (streamRef.current) {
            const track = streamRef.current.getVideoTracks()[0]
            const capabilities = track.getCapabilities() as any
            if (capabilities.torch) {
                await track.applyConstraints({
                    advanced: [{ torch: !torchOn } as any]
                })
                setTorchOn(!torchOn)
            }
        }
    }

    const scanFrame = () => {
        if (!scanning || !videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Get image data from center region (where barcode likely is)
            const centerX = canvas.width / 4
            const centerY = canvas.height / 3
            const scanWidth = canvas.width / 2
            const scanHeight = canvas.height / 3

            const imageData = ctx.getImageData(centerX, centerY, scanWidth, scanHeight)

            // Try to detect barcode using BarcodeDetector API (Chrome/Edge)
            if ('BarcodeDetector' in window) {
                const detector = new (window as any).BarcodeDetector({
                    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
                })

                detector.detect(canvas)
                    .then((barcodes: any[]) => {
                        if (barcodes.length > 0) {
                            const barcode = barcodes[0].rawValue
                            stopCamera()
                            onScan(barcode)
                        }
                    })
                    .catch(console.error)
            }
        }

        if (scanning) {
            requestAnimationFrame(scanFrame)
        }
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
                <button onClick={onClose} className="p-2 rounded-full bg-white/20">
                    <X className="w-6 h-6 text-white" />
                </button>
                <span className="text-white font-medium">Scan Barcode</span>
                <button onClick={toggleTorch} className="p-2 rounded-full bg-white/20">
                    {torchOn ? (
                        <FlashlightOff className="w-6 h-6 text-yellow-400" />
                    ) : (
                        <Flashlight className="w-6 h-6 text-white" />
                    )}
                </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan Target Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-32 border-2 border-orange-500 rounded-lg relative">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />

                        {/* Scanning line animation */}
                        <div className="absolute left-0 right-0 h-0.5 bg-orange-500 animate-pulse"
                            style={{ top: '50%', boxShadow: '0 0 10px rgba(249, 115, 22, 0.8)' }} />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <div className="text-center p-6">
                            <Camera className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-white mb-2">{error}</p>
                            <button
                                onClick={startCamera}
                                className="px-4 py-2 bg-orange-500 rounded-lg text-white"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="p-4 bg-black/50 text-center">
                <p className="text-gray-400 text-sm">
                    Position the barcode within the frame
                </p>
            </div>
        </div>
    )
}
