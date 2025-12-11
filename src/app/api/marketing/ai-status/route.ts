import { NextResponse } from 'next/server'

// Check if Ollama is running locally
export async function GET() {
    try {
        // Try to connect to Ollama API
        const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
        })

        if (response.ok) {
            const data = await response.json()
            const hasModels = data.models && data.models.length > 0

            return NextResponse.json({
                available: hasModels,
                models: data.models?.map((m: { name: string }) => m.name) || [],
                message: hasModels ? 'Ollama is ready with models' : 'Ollama running but no models installed'
            })
        }

        return NextResponse.json({
            available: false,
            models: [],
            message: 'Ollama not responding'
        })
    } catch {
        return NextResponse.json({
            available: false,
            models: [],
            message: 'Ollama not detected. Using smart templates instead.'
        })
    }
}
