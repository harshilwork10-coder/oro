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
}

export function generateReceipt(data: ReceiptData) {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // Thermal receipt size (80mm width)
    })

    let yPos = 10

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(data.franchiseName || 'Aura Business', 40, yPos, { align: 'center' })
    yPos += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(data.locationName || 'Location', 40, yPos, { align: 'center' })
    yPos += 8

    // Divider
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

        const qtyText = `  ${item.quantity} x $${item.price.toFixed(2)}`
        const totalText = `$${item.total.toFixed(2)}`
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
