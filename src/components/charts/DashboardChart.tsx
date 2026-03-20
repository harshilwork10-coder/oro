/**
 * DashboardChart — Reusable chart component using Canvas API
 *
 * Zero external dependencies — renders bar, line, donut, and sparkline charts
 * using native HTML Canvas. No Chart.js/Recharts needed = smaller bundle.
 *
 * All rendering is client-side — zero API calls.
 */

'use client'

import { useEffect, useRef } from 'react'

interface ChartProps {
    type: 'bar' | 'line' | 'donut' | 'sparkline'
    data: { label: string; value: number; color?: string }[]
    width?: number
    height?: number
    className?: string
    showLabels?: boolean
    showValues?: boolean
    animate?: boolean
    colors?: string[]
}

const DEFAULT_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

export default function DashboardChart({
    type, data, width = 400, height = 200, className = '',
    showLabels = true, showValues = true, animate = true,
    colors = DEFAULT_COLORS,
}: ChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !data?.length) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // HiDPI support
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        let progress = animate ? 0 : 1

        const draw = () => {
            ctx.clearRect(0, 0, width, height)

            switch (type) {
                case 'bar': drawBar(ctx, data, width, height, progress, colors, showLabels, showValues); break
                case 'line': drawLine(ctx, data, width, height, progress, colors[0]); break
                case 'donut': drawDonut(ctx, data, width, height, progress, colors, showLabels); break
                case 'sparkline': drawSparkline(ctx, data, width, height, progress, colors[0]); break
            }

            if (progress < 1) {
                progress = Math.min(1, progress + 0.03)
                animRef.current = requestAnimationFrame(draw)
            }
        }

        draw()
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
    }, [data, type, width, height, animate, colors, showLabels, showValues])

    return <canvas ref={canvasRef} className={`${className}`} />
}

function drawBar(
    ctx: CanvasRenderingContext2D, data: any[], w: number, h: number,
    progress: number, colors: string[], showLabels: boolean, showValues: boolean
) {
    const max = Math.max(...data.map(d => d.value), 1)
    const padding = { top: 10, bottom: showLabels ? 30 : 10, left: 10, right: 10 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom
    const barW = Math.min(40, (chartW / data.length) * 0.7)
    const gap = (chartW - barW * data.length) / (data.length + 1)

    data.forEach((d, i) => {
        const x = padding.left + gap + i * (barW + gap)
        const barH = (d.value / max) * chartH * progress
        const y = padding.top + chartH - barH
        const color = d.color || colors[i % colors.length]

        // Bar with rounded top
        ctx.beginPath()
        ctx.fillStyle = color
        const radius = Math.min(4, barW / 2)
        ctx.moveTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.lineTo(x + barW - radius, y)
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius)
        ctx.lineTo(x + barW, padding.top + chartH)
        ctx.lineTo(x, padding.top + chartH)
        ctx.closePath()
        ctx.fill()

        // Value above bar
        if (showValues && progress > 0.5) {
            ctx.fillStyle = '#a8a29e'
            ctx.font = '10px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(formatShortNumber(d.value), x + barW / 2, y - 4)
        }

        // Label below
        if (showLabels) {
            ctx.fillStyle = '#78716c'
            ctx.font = '9px Inter, sans-serif'
            ctx.textAlign = 'center'
            const label = d.label.length > 6 ? d.label.slice(0, 5) + '..' : d.label
            ctx.fillText(label, x + barW / 2, h - 8)
        }
    })
}

function drawLine(
    ctx: CanvasRenderingContext2D, data: any[], w: number, h: number,
    progress: number, color: string
) {
    if (data.length < 2) return
    const max = Math.max(...data.map(d => d.value), 1)
    const padding = { top: 10, bottom: 20, left: 10, right: 10 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom
    const stepX = chartW / (data.length - 1)

    const pointsToDraw = Math.ceil(data.length * progress)

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH)

    for (let i = 0; i < pointsToDraw; i++) {
        const x = padding.left + i * stepX
        const y = padding.top + chartH - (data[i].value / max) * chartH
        if (i === 0) ctx.lineTo(x, y)
        else {
            const prevX = padding.left + (i - 1) * stepX
            const prevY = padding.top + chartH - (data[i - 1].value / max) * chartH
            const cpX = (prevX + x) / 2
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
        }
    }

    const lastX = padding.left + (pointsToDraw - 1) * stepX
    ctx.lineTo(lastX, padding.top + chartH)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Line on top
    ctx.beginPath()
    for (let i = 0; i < pointsToDraw; i++) {
        const x = padding.left + i * stepX
        const y = padding.top + chartH - (data[i].value / max) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else {
            const prevX = padding.left + (i - 1) * stepX
            const prevY = padding.top + chartH - (data[i - 1].value / max) * chartH
            const cpX = (prevX + x) / 2
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
        }
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    // Dots
    for (let i = 0; i < pointsToDraw; i++) {
        const x = padding.left + i * stepX
        const y = padding.top + chartH - (data[i].value / max) * chartH
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#1c1917'
        ctx.lineWidth = 1.5
        ctx.stroke()
    }
}

function drawDonut(
    ctx: CanvasRenderingContext2D, data: any[], w: number, h: number,
    progress: number, colors: string[], showLabels: boolean
) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1
    const cx = w * 0.35, cy = h / 2
    const outerR = Math.min(cx, cy) - 10
    const innerR = outerR * 0.6
    let startAngle = -Math.PI / 2

    data.forEach((d, i) => {
        const sliceAngle = (d.value / total) * Math.PI * 2 * progress
        const color = d.color || colors[i % colors.length]

        ctx.beginPath()
        ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle)
        ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true)
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()

        startAngle += sliceAngle
    })

    // Legend on right
    if (showLabels) {
        const legendX = w * 0.65
        data.forEach((d, i) => {
            const ly = 20 + i * 22
            ctx.fillStyle = d.color || colors[i % colors.length]
            ctx.fillRect(legendX, ly, 10, 10)
            ctx.fillStyle = '#a8a29e'
            ctx.font = '11px Inter, sans-serif'
            ctx.textAlign = 'left'
            const pct = ((d.value / total) * 100).toFixed(0)
            ctx.fillText(`${d.label} (${pct}%)`, legendX + 16, ly + 9)
        })
    }
}

function drawSparkline(
    ctx: CanvasRenderingContext2D, data: any[], w: number, h: number,
    progress: number, color: string
) {
    if (data.length < 2) return
    const max = Math.max(...data.map(d => d.value), 1)
    const min = Math.min(...data.map(d => d.value), 0)
    const range = max - min || 1
    const stepX = w / (data.length - 1)
    const pointsToDraw = Math.ceil(data.length * progress)

    ctx.beginPath()
    for (let i = 0; i < pointsToDraw; i++) {
        const x = i * stepX
        const y = h - ((data[i].value - min) / range) * (h - 4) - 2
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
}

function formatShortNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toFixed(0)
}
