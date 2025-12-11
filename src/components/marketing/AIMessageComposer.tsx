'use client'

import { useState } from 'react'
import {
    Mail,
    MessageSquare,
    Sparkles,
    Send,
    Clock,
    Copy,
    Check,
    RefreshCw,
    Zap,
    Heart,
    Gift,
    AlertCircle
} from 'lucide-react'

// Smart templates for when Ollama is not available
const SMART_TEMPLATES = {
    promotion: {
        email: {
            professional: `Subject: Exclusive Offer Just for You!\n\nDear {{customer_name}},\n\nWe appreciate your loyalty and wanted to share an exclusive offer with you.\n\nFor a limited time, enjoy {{discount}}% off your next visit to {{business_name}}.\n\nBook your appointment today and treat yourself!\n\nBest regards,\n{{business_name}} Team`,
            friendly: `Hey {{customer_name}}! 👋\n\nWe've got something special for you!\n\n🎉 Get {{discount}}% OFF your next visit!\n\nWe miss seeing you at {{business_name}} and wanted to say thanks for being awesome.\n\nBook now before this deal expires!\n\n💜 The {{business_name}} Family`,
            urgent: `⚡ FLASH SALE - {{customer_name}}!\n\n{{discount}}% OFF - TODAY ONLY!\n\nDon't miss this exclusive deal at {{business_name}}.\n\nSlots are filling up fast. Book NOW!\n\n{{business_name}}`
        },
        sms: {
            professional: `{{business_name}}: Hi {{customer_name}}, enjoy {{discount}}% off your next visit. Book today!`,
            friendly: `Hey {{customer_name}}! 🎉 {{discount}}% OFF at {{business_name}}! We miss you - book now!`,
            urgent: `⚡ FLASH SALE {{customer_name}}! {{discount}}% OFF today only at {{business_name}}. Book NOW!`
        }
    },
    birthday: {
        email: {
            professional: `Subject: Happy Birthday from {{business_name}}!\n\nDear {{customer_name}},\n\nWishing you a wonderful birthday filled with joy!\n\nAs our gift to you, please enjoy a complimentary {{gift}} on your next visit.\n\nWe look forward to celebrating with you!\n\nWarm regards,\n{{business_name}}`,
            friendly: `🎂 HAPPY BIRTHDAY {{customer_name}}! 🎉\n\nIt's YOUR day and we want to celebrate with you!\n\nHere's a FREE {{gift}} just for you at {{business_name}}!\n\nCome treat yourself - you deserve it!\n\n🎈 Love, {{business_name}}`,
            urgent: `🎂 {{customer_name}}, your birthday gift is waiting!\n\nFREE {{gift}} at {{business_name}}!\n\nClaim it before {{expiry}}!\n\n{{business_name}}`
        },
        sms: {
            professional: `{{business_name}}: Happy Birthday {{customer_name}}! Enjoy a free {{gift}} on us.`,
            friendly: `🎂 Happy Birthday {{customer_name}}! FREE {{gift}} waiting for you at {{business_name}}! 🎉`,
            urgent: `🎂 {{customer_name}} - Your FREE birthday {{gift}} expires soon! Visit {{business_name}} now!`
        }
    },
    reminder: {
        email: {
            professional: `Subject: We Miss You at {{business_name}}!\n\nDear {{customer_name}},\n\nIt's been a while since your last visit and we wanted to check in.\n\nWe'd love to see you again! Book your next appointment at your convenience.\n\nBest regards,\n{{business_name}}`,
            friendly: `Hey {{customer_name}}! 💭\n\nWe've been thinking about you! It's been a while since we've seen you at {{business_name}}.\n\nCome back soon - we miss you!\n\n💜 {{business_name}} Team`,
            urgent: `{{customer_name}}, it's been too long!\n\nYour wellness matters to us at {{business_name}}.\n\nBook today - limited slots available!\n\n{{business_name}}`
        },
        sms: {
            professional: `{{business_name}}: Hi {{customer_name}}, we miss you! Schedule your next visit today.`,
            friendly: `Hey {{customer_name}}! 💜 We miss you at {{business_name}}! Come back soon?`,
            urgent: `{{customer_name}} - It's been too long! Book at {{business_name}} now, slots filling fast!`
        }
    },
    reengagement: {
        email: {
            professional: `Subject: Welcome Back Offer at {{business_name}}\n\nDear {{customer_name}},\n\nWe noticed you haven't visited us in a while. We'd love to welcome you back!\n\nAs a special gesture, please enjoy {{discount}}% off your return visit.\n\nWe hope to see you soon.\n\nBest regards,\n{{business_name}}`,
            friendly: `{{customer_name}}, where have you been?! 😢\n\nWe miss your face at {{business_name}}!\n\nHere's {{discount}}% OFF to welcome you back home. 💜\n\nCan't wait to see you!\n\n{{business_name}} Family`,
            urgent: `⚡ {{customer_name}} - COME BACK!\n\n{{discount}}% OFF - Just for returning customers!\n\nOffer expires soon at {{business_name}}!\n\nBook NOW!`
        },
        sms: {
            professional: `{{business_name}}: {{customer_name}}, welcome back with {{discount}}% off! We miss you.`,
            friendly: `{{customer_name}}! 💜 {{discount}}% OFF to welcome you back to {{business_name}}! Miss you!`,
            urgent: `⚡ {{customer_name}} - {{discount}}% OFF comeback deal! Expires soon! {{business_name}}`
        }
    }
}

type MessageType = 'email' | 'sms'
type ToneType = 'professional' | 'friendly' | 'urgent'
type PurposeType = 'promotion' | 'birthday' | 'reminder' | 'reengagement'

interface AIMessageComposerProps {
    businessName?: string
}

export default function AIMessageComposer({ businessName = 'Your Business' }: AIMessageComposerProps) {
    const [messageType, setMessageType] = useState<MessageType>('email')
    const [tone, setTone] = useState<ToneType>('friendly')
    const [purpose, setPurpose] = useState<PurposeType>('promotion')
    const [customPrompt, setCustomPrompt] = useState('')
    const [generatedContent, setGeneratedContent] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable'>('unavailable')
    const [copied, setCopied] = useState(false)

    // Business details for template personalization
    const businessDetails = {
        business_name: businessName,
        customer_name: 'Sarah',
        discount: '20',
        gift: 'treatment upgrade',
        expiry: 'this week'
    }

    // Check if Ollama is available
    const checkOllamaStatus = async () => {
        setAiStatus('checking')
        try {
            const res = await fetch('/api/marketing/ai-status')
            const data = await res.json()
            setAiStatus(data.available ? 'available' : 'unavailable')
        } catch {
            setAiStatus('unavailable')
        }
    }

    // Generate content using local AI or templates
    const generateContent = async () => {
        setIsGenerating(true)

        if (aiStatus === 'available') {
            try {
                const res = await fetch('/api/marketing/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messageType,
                        tone,
                        purpose,
                        customPrompt,
                        businessDetails
                    })
                })
                const data = await res.json()
                if (data.content) {
                    setGeneratedContent(data.content)
                } else {
                    useTemplate()
                }
            } catch {
                useTemplate()
            }
        } else {
            useTemplate()
        }

        setIsGenerating(false)
    }

    // Use smart template
    const useTemplate = () => {
        const template = SMART_TEMPLATES[purpose][messageType][tone]
        let content = template

        Object.entries(businessDetails).forEach(([key, value]) => {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })

        setGeneratedContent(content)
    }

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(generatedContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const purposeIcons = {
        promotion: <Zap className="w-4 h-4" />,
        birthday: <Gift className="w-4 h-4" />,
        reminder: <Heart className="w-4 h-4" />,
        reengagement: <RefreshCw className="w-4 h-4" />
    }

    return (
        <div className="space-y-6">
            {/* AI Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50 border border-stone-700">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-medium">AI Message Generator</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${aiStatus === 'available'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : aiStatus === 'unavailable'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-stone-700 text-stone-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${aiStatus === 'available' ? 'bg-emerald-400' :
                                aiStatus === 'unavailable' ? 'bg-amber-400' : 'bg-stone-500 animate-pulse'
                            }`} />
                        {aiStatus === 'available' ? 'Local AI Ready' :
                            aiStatus === 'unavailable' ? 'Using Templates' : 'Checking...'}
                    </div>
                    <button
                        onClick={checkOllamaStatus}
                        className="p-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-400 transition-colors"
                        title="Check AI status"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <div className="space-y-5">
                    {/* Message Type */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Message Type
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setMessageType('email')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${messageType === 'email'
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Mail className="w-5 h-5" />
                                Email
                            </button>
                            <button
                                onClick={() => setMessageType('sms')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${messageType === 'sms'
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <MessageSquare className="w-5 h-5" />
                                SMS
                            </button>
                        </div>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Campaign Purpose
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['promotion', 'birthday', 'reminder', 'reengagement'] as PurposeType[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPurpose(p)}
                                    className={`flex items-center gap-2 py-2.5 px-4 rounded-lg border transition-all capitalize ${purpose === p
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                            : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                        }`}
                                >
                                    {purposeIcons[p]}
                                    {p === 'reengagement' ? 'Win Back' : p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tone */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Tone
                        </label>
                        <div className="flex gap-3">
                            {(['professional', 'friendly', 'urgent'] as ToneType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={`flex-1 py-2.5 px-4 rounded-lg border transition-all capitalize ${tone === t
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                            : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Prompt (for AI mode) */}
                    {aiStatus === 'available' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Additional Details (Optional)
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="E.g., mention our new facial treatment, include holiday theme..."
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none"
                                rows={3}
                            />
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={generateContent}
                        disabled={isGenerating}
                        className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Message
                            </>
                        )}
                    </button>
                </div>

                {/* Preview Panel */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-stone-300">
                            Preview
                        </label>
                        {generatedContent && (
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        )}
                    </div>

                    <div className={`min-h-[280px] p-4 rounded-lg border ${generatedContent
                            ? 'bg-stone-800/50 border-stone-700'
                            : 'bg-stone-900/50 border-stone-800 border-dashed'
                        }`}>
                        {generatedContent ? (
                            <pre className="whitespace-pre-wrap text-stone-300 font-sans text-sm leading-relaxed">
                                {generatedContent}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-stone-500 py-16">
                                <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                                <p>Your message will appear here</p>
                                <p className="text-sm mt-1">Configure settings and click Generate</p>
                            </div>
                        )}
                    </div>

                    {generatedContent && (
                        <div className="flex gap-3">
                            <button className="flex-1 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Clock className="w-4 h-4" />
                                Schedule
                            </button>
                            <button className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Send className="w-4 h-4" />
                                Send Now
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Notice */}
            {aiStatus === 'unavailable' && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-amber-400 font-medium">Local AI (Ollama) not detected</p>
                        <p className="text-stone-400 mt-1">
                            Using smart templates. For AI generation, install Ollama: <code className="bg-stone-800 px-1.5 py-0.5 rounded">ollama run llama2</code>
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
