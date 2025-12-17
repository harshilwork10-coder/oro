import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface GenerateRequest {
    messageType: 'email' | 'sms'
    tone: 'professional' | 'friendly' | 'urgent'
    purpose: 'promotion' | 'birthday' | 'reminder' | 'reengagement'
    customPrompt?: string
    businessDetails: {
        business_name: string
        customer_name: string
        discount?: string
        gift?: string
        expiry?: string
    }
}

// Generate marketing content using local Ollama
export async function POST(request: NextRequest) {
    // SECURITY: Require authentication to prevent abuse
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body: GenerateRequest = await request.json()
        const { messageType, tone, purpose, customPrompt, businessDetails } = body

        // Build the prompt for the local AI
        const systemPrompt = `You are a marketing copywriter for ${businessDetails.business_name}. 
Write ${messageType === 'email' ? 'an email' : 'a short SMS message'} with a ${tone} tone.
The purpose is: ${purpose}.
${customPrompt ? `Additional context: ${customPrompt}` : ''}
${purpose === 'promotion' || purpose === 'reengagement' ? `The discount is ${businessDetails.discount}%` : ''}
${purpose === 'birthday' ? `The gift is: ${businessDetails.gift}` : ''}
The customer's name is ${businessDetails.customer_name}.
${messageType === 'sms' ? 'Keep it under 160 characters.' : 'Include a subject line.'}
Write ONLY the message content, no explanations.`

        try {
            // Try to use Ollama locally
            const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2', // or 'mistral' if available
                    prompt: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: messageType === 'sms' ? 50 : 500
                    }
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            })

            if (ollamaResponse.ok) {
                const data = await ollamaResponse.json()
                return NextResponse.json({
                    content: data.response,
                    source: 'ollama',
                    model: 'llama2'
                })
            }
        } catch {
            // Ollama not available, will fall back to templates on frontend
        }

        // Return error so frontend falls back to templates
        return NextResponse.json({
            error: 'AI not available',
            message: 'Please use smart templates'
        }, { status: 503 })

    } catch (error) {
        console.error('Error generating content:', error)
        return NextResponse.json(
            { error: 'Failed to generate content' },
            { status: 500 }
        )
    }
}
