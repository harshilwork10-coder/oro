import jsPDF from 'jspdf'

interface ReceiptData {
    id: string
    total: number
    subtotal: number
    tax: number
    paymentMethod: string
    cashAmount?: number
    cardAmount?: number
    createdAt: string
    locationName?: string
    franchiseName?: string
    lineItems: Array<{
        name?: string
        quantity: number
        price: number
        discount: number
        total: number
    }>
    branding?: {
        logoUrl?: string
        primaryColor?: string
    }
}

export async function generateReceipt(data: ReceiptData) {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // Thermal receipt size (80mm width)
    })

    let yPos = 10

    // Add Logo if available
    if (data.branding?.logoUrl) {
        try {
            // Create an image element to load the logo
            const img = new Image()
            img.src = data.branding.logoUrl
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
            })

            // Calculate aspect ratio to fit width 40mm
            const aspectRatio = img.width / img.height
            const width = 40
            const height = width / aspectRatio

            doc.addImage(img, 'PNG', 20, yPos, width, height)
            yPos += height + 5
        } catch (error) {
            console.error('Error loading logo for receipt:', error)
            // Fallback to text if logo fails
        }
    }

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    if (data.branding?.primaryColor) {
        doc.setTextColor(data.branding.primaryColor)
    }
    doc.text(data.franchiseName || 'ORO 9 Business', 40, yPos, { align: 'center' })
    doc.setTextColor(0, 0, 0) // Reset color
    yPos += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(data.locationName || 'Location', 40, yPos, { align: 'center' })
    yPos += 8

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(5, yPos, 75, yPos)
    yPos += 6

    // Date & Transaction ID
    doc.setFontSize(8)
    const date = new Date(data.createdAt).toLocaleString()
    doc.text(`Date: ${date}`, 5, yPos)
    yPos += 4
    // Format invoice number as YYYYMMDD-XXX (daily sequence)
    const dateObj = new Date(data.createdAt)
    const dateStr = dateObj.getFullYear().toString() +
        (dateObj.getMonth() + 1).toString().padStart(2, '0') +
        dateObj.getDate().toString().padStart(2, '0')

    // Use dailySequence if available (from API), otherwise fallback to time
    const sequenceStr = (data as any).dailySequence
        ? (data as any).dailySequence.toString().padStart(3, '0')
        : dateObj.getHours().toString().padStart(2, '0') + dateObj.getMinutes().toString().padStart(2, '0')

    const invoiceNum = `${dateStr}-${sequenceStr}`
    doc.text(`Invoice #${invoiceNum}`, 5, yPos)
    yPos += 6

    // Divider
    doc.line(5, yPos, 75, yPos)
    yPos += 5

    // Items
    doc.setFontSize(9)
    data.lineItems.forEach((item) => {
        const itemName = item.name || 'Item'
        doc.text(itemName, 5, yPos)
        yPos += 4

        const price = Number(item.price) || 0
        const total = Number(item.total) || 0
        const qtyText = `  ${item.quantity} x $${price.toFixed(2)}`
        const totalText = `$${total.toFixed(2)}`
        doc.text(qtyText, 5, yPos)
        doc.text(totalText, 75, yPos, { align: 'right' })
        yPos += 4

        if (item.discount > 0) {
            doc.text(`  Discount: ${item.discount}%`, 5, yPos)
            yPos += 4
        }
        yPos += 1
    })

    // Divider
    yPos += 2
    doc.line(5, yPos, 75, yPos)
    yPos += 5

    // Totals
    doc.setFontSize(9)
    doc.text('Subtotal:', 5, yPos)
    doc.text(`$${parseFloat(data.subtotal.toString()).toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 4

    doc.text('Tax:', 5, yPos)
    doc.text(`$${parseFloat(data.tax.toString()).toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL:', 5, yPos)
    doc.text(`$${parseFloat(data.total.toString()).toFixed(2)}`, 75, yPos, { align: 'right' })
    yPos += 6

    // Payment Method
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (data.paymentMethod === 'SPLIT') {
        doc.text(`Cash: $${parseFloat((data.cashAmount || 0).toString()).toFixed(2)}`, 5, yPos)
        yPos += 4
        doc.text(`Card: $${parseFloat((data.cardAmount || 0).toString()).toFixed(2)}`, 5, yPos)
    } else {
        doc.text(`Payment: ${data.paymentMethod}`, 5, yPos)
    }
    yPos += 8

    // Footer
    doc.line(5, yPos, 75, yPos)
    yPos += 5
    doc.setFontSize(8)
    doc.text('Thank you for your business!', 40, yPos, { align: 'center' })

    // Save the PDF
    const filename = `receipt_${data.id.slice(0, 8)}_${Date.now()}.pdf`
    doc.save(filename)
}

