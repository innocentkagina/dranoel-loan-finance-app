import { useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useLoading } from '@/contexts/LoadingContext'
import { PDFTemplate, PDFConfig } from '@/lib/pdf-templates'

interface UsePrintAndPdfOptions {
  title?: string
  filename?: string
  useEnhancedPDF?: boolean
}

export const usePrintAndPdf = (options: UsePrintAndPdfOptions = {}) => {
  const printRef = useRef<HTMLDivElement>(null)
  const { withLoading } = useLoading()

  const handlePrint = () => {
    if (!printRef.current) return

    const printContent = printRef.current.innerHTML
    const originalContent = document.body.innerHTML

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups for this site to enable printing.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title || 'Print Document'}</title>
        <style>
          body {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }

          .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0F172A;
            padding-bottom: 20px;
          }

          .print-header h1 {
            color: #0F172A;
            margin: 0;
            font-size: 24px;
          }

          .print-header p {
            margin: 5px 0 0 0;
            color: #64748B;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }

          th, td {
            border: 1px solid #E2E8F0;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
          }

          th {
            background-color: #F8FAFC;
            font-weight: 600;
            color: #0F172A;
          }

          .card {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 16px;
            margin: 15px 0;
            background: #FAFAFA;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 15px 0;
          }

          .stat-card {
            text-align: center;
            padding: 16px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            background: white;
          }

          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #0F172A;
            margin: 8px 0 4px 0;
          }

          .stat-label {
            font-size: 12px;
            color: #64748B;
            margin: 0;
          }

          .chip {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }

          .chip.success {
            background-color: #DCFCE7;
            color: #166534;
          }

          .chip.warning {
            background-color: #FEF3C7;
            color: #92400E;
          }

          .chip.error {
            background-color: #FEE2E2;
            color: #991B1B;
          }

          .chip.info {
            background-color: #DBEAFE;
            color: #1E40AF;
          }

          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #0F172A;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 5px;
          }

          .print-footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #64748B;
            border-top: 1px solid #E2E8F0;
            padding-top: 15px;
          }

          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Dranoel Consults Limited</h1>
          <p>Licensed Financial Services Provider</p>
          <p>Generated on: ${new Date().toLocaleDateString('en-UG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        ${printContent}
        <div class="print-footer">
          <p>© ${new Date().getFullYear()} Dranoel Consults Limited. All rights reserved.</p>
          <p>Licensed by Bank of Uganda | Confidential Document</p>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  const handleDownloadPdf = async () => {
    if (!printRef.current) return

    await withLoading(async () => {
      try {
        const element = printRef.current!

        if (options.useEnhancedPDF) {
          // Use enhanced PDF generation
          await generateEnhancedPDF(element)
        } else {
          // Use legacy HTML to canvas method
          await generateLegacyPDF(element)
        }
      } catch (error) {
        console.error('Error generating PDF:', error)
        alert('Error generating PDF. Please try again.')
      }
    }, 'Generating PDF...')
  }

  const generateEnhancedPDF = async (element: HTMLElement) => {
    // Create canvas from the element with higher quality
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      allowTaint: true,
      foreignObjectRendering: true,
    })

    const imgData = canvas.toDataURL('image/png', 0.95)

    const config: PDFConfig = {
      title: options.title || 'Document',
      filename: options.filename || `document_${new Date().toISOString().split('T')[0]}.pdf`,
      subject: options.title || 'Generated Document',
      author: 'Dranoel Consults Limited'
    }

    const pdf = new PDFTemplate(config)

    // Add header
    pdf.addHeader({
      title: 'Dranoel Consults Limited',
      subtitle: 'Licensed Financial Services Provider',
      address: ['Plot 123, Financial District', 'Kampala, Uganda'],
      phone: '+256 700 123 456',
      email: 'info@dranoel.com',
      website: 'www.dranoel.com'
    })

    // Add title if provided
    if (options.title) {
      pdf.addTitle(options.title)
    }

    // Add the captured content as an image
    const pdfInstance = pdf.getPDF()
    const imgProps = pdfInstance.getImageProperties(imgData)
    const pdfWidth = pdfInstance.internal.pageSize.getWidth() - 40 // 20mm margins each side
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    let heightLeft = pdfHeight
    let position = 80 // Start below header

    // Add first page content
    if (heightLeft <= pdfInstance.internal.pageSize.getHeight() - 100) {
      // Content fits on one page
      pdfInstance.addImage(imgData, 'PNG', 20, position, pdfWidth, pdfHeight, undefined, 'FAST')
    } else {
      // Content needs multiple pages
      pdfInstance.addImage(imgData, 'PNG', 20, position, pdfWidth, pdfHeight, undefined, 'FAST')
      heightLeft -= (pdfInstance.internal.pageSize.getHeight() - position - 40)

      while (heightLeft >= 0) {
        pdf.addPage()
        position = -heightLeft + 20
        pdfInstance.addImage(imgData, 'PNG', 20, position, pdfWidth, pdfHeight, undefined, 'FAST')
        heightLeft -= (pdfInstance.internal.pageSize.getHeight() - 60)
      }
    }

    // Add footer and save
    pdf.addFooter({
      showPageNumbers: true,
      showDate: true,
      confidential: false
    })

    pdf.save()
  }

  const generateLegacyPDF = async (element: HTMLElement) => {
    // Legacy method (existing code)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
    })

    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Add header
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Dranoel Consults Limited', 105, 20, { align: 'center' })

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Licensed Financial Services Provider', 105, 28, { align: 'center' })
    pdf.text(`Generated on: ${new Date().toLocaleDateString('en-UG')}`, 105, 34, { align: 'center' })

    // Add content
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    let heightLeft = pdfHeight
    let position = 45

    if (heightLeft <= pdf.internal.pageSize.getHeight() - 65) {
      pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight)
    } else {
      pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight)
      heightLeft -= (pdf.internal.pageSize.getHeight() - position - 15)

      while (heightLeft >= 0) {
        pdf.addPage()
        position = -heightLeft + 15
        pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight)
        heightLeft -= (pdf.internal.pageSize.getHeight() - 30)
      }
    }

    // Add footer to all pages
    const pageCount = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(
        `© ${new Date().getFullYear()} Dranoel Consults Limited. All rights reserved.`,
        105,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() - 15,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      )
    }

    const filename = options.filename || `dranoel_document_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  }

  return {
    printRef,
    handlePrint,
    handleDownloadPdf,
  }
}