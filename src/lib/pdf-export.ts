'use client';

// PDF Export Utility for Reports
// Uses browser print API with custom styling for clean PDF output

export interface PDFExportOptions {
    title: string;
    subtitle?: string;
    filename?: string;
}

export function exportToPDF(options: PDFExportOptions) {
    const { title, subtitle, filename } = options;

    // Create a print-specific style
    const printStyles = `
        @media print {
            body * { visibility: hidden; }
            #print-content, #print-content * { visibility: visible; }
            #print-content { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%;
                padding: 20px;
            }
            @page { 
                margin: 0.5in; 
                size: letter;
            }
        }
    `;

    // Add print styles temporarily
    const styleSheet = document.createElement('style');
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);

    // Trigger print
    window.print();

    // Clean up
    setTimeout(() => {
        document.head.removeChild(styleSheet);
    }, 1000);
}

// Direct download as PDF using html2canvas + jspdf (if installed)
export async function downloadPDF(elementId: string, filename: string): Promise<boolean> {
    try {
        // Dynamic import for optional dependencies
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Element not found:', elementId);
            return false;
        }

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#0F172A'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${filename}.pdf`);

        return true;
    } catch (error) {
        console.error('PDF library not available, using print fallback', error);
        window.print();
        return true;
    }
}
