import jsPDF from 'jspdf'
import autoTable, { UserOptions } from 'jspdf-autotable'

export interface PDFConfig {
  title: string
  subtitle?: string
  filename: string
  author?: string
  subject?: string
  keywords?: string[]
}

export interface PDFHeader {
  title: string
  subtitle?: string
  logo?: string
  address?: string[]
  phone?: string
  email?: string
  website?: string
}

export interface PDFFooter {
  showPageNumbers?: boolean
  showDate?: boolean
  customText?: string
  confidential?: boolean
}

export class PDFTemplate {
  private pdf: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margins = { top: 25, right: 20, bottom: 25, left: 20 }
  private currentY = 0

  constructor(config: PDFConfig, orientation: 'portrait' | 'landscape' = 'portrait') {
    this.pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    })

    this.pageWidth = this.pdf.internal.pageSize.getWidth()
    this.pageHeight = this.pdf.internal.pageSize.getHeight()
    this.currentY = this.margins.top

    // Set document properties
    this.pdf.setProperties({
      title: config.title,
      subject: config.subject || config.title,
      author: config.author || 'Dranoel Consults Limited',
      keywords: config.keywords?.join(', ') || '',
      creator: 'Dranoel Financial Management System',
    })
  }

  // Add professional header
  addHeader(header: PDFHeader): void {
    const startY = this.margins.top

    // Company logo area (placeholder for now)
    this.pdf.setDrawColor(15, 23, 42)
    this.pdf.setFillColor(249, 115, 22) // Orange color
    this.pdf.roundedRect(this.margins.left, startY - 5, 15, 15, 2, 2, 'F')

    this.pdf.setTextColor(255, 255, 255)
    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text('D', this.margins.left + 7.5, startY + 3, { align: 'center' })

    // Company name
    this.pdf.setTextColor(15, 23, 42)
    this.pdf.setFontSize(20)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text('Dranoel Consults Limited', this.margins.left + 20, startY + 3)

    // Subtitle
    if (header.subtitle) {
      this.pdf.setFontSize(10)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setTextColor(100, 116, 139) // Gray
      this.pdf.text(header.subtitle, this.margins.left + 20, startY + 10)
    }

    // Contact info (right side)
    const rightX = this.pageWidth - this.margins.right
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(100, 116, 139)
    let contactY = startY

    if (header.address) {
      header.address.forEach((line, index) => {
        this.pdf.text(line, rightX, contactY + (index * 4), { align: 'right' })
      })
      contactY += header.address.length * 4
    }

    if (header.phone) {
      this.pdf.text(`Tel: ${header.phone}`, rightX, contactY, { align: 'right' })
      contactY += 4
    }

    if (header.email) {
      this.pdf.text(`Email: ${header.email}`, rightX, contactY, { align: 'right' })
      contactY += 4
    }

    if (header.website) {
      this.pdf.text(header.website, rightX, contactY, { align: 'right' })
    }

    // Header line
    this.pdf.setDrawColor(226, 232, 240)
    this.pdf.setLineWidth(0.5)
    this.pdf.line(this.margins.left, startY + 20, this.pageWidth - this.margins.right, startY + 20)

    this.currentY = startY + 30
  }

  // Add document title
  addTitle(title: string, subtitle?: string): void {
    this.pdf.setTextColor(15, 23, 42)
    this.pdf.setFontSize(18)
    this.pdf.setFont('helvetica', 'bold')

    const titleLines = this.pdf.splitTextToSize(title, this.pageWidth - this.margins.left - this.margins.right)
    this.pdf.text(titleLines, this.margins.left, this.currentY)
    this.currentY += titleLines.length * 8

    if (subtitle) {
      this.pdf.setFontSize(12)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setTextColor(100, 116, 139)

      const subtitleLines = this.pdf.splitTextToSize(subtitle, this.pageWidth - this.margins.left - this.margins.right)
      this.pdf.text(subtitleLines, this.margins.left, this.currentY)
      this.currentY += subtitleLines.length * 6
    }

    this.currentY += 10
  }

  // Add section header
  addSectionHeader(title: string): void {
    this.ensureSpace(15)

    this.pdf.setTextColor(15, 23, 42)
    this.pdf.setFontSize(14)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(title, this.margins.left, this.currentY)

    // Section underline
    this.pdf.setDrawColor(249, 115, 22) // Orange
    this.pdf.setLineWidth(1)
    this.pdf.line(this.margins.left, this.currentY + 2, this.margins.left + 60, this.currentY + 2)

    this.currentY += 12
  }

  // Add key-value pairs
  addKeyValuePairs(pairs: { [key: string]: string | number }): void {
    this.ensureSpace(Object.keys(pairs).length * 8 + 10)

    const maxKeyWidth = 60
    this.pdf.setFontSize(10)

    Object.entries(pairs).forEach(([key, value]) => {
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setTextColor(100, 116, 139)
      this.pdf.text(`${key}:`, this.margins.left, this.currentY)

      this.pdf.setFont('helvetica', 'bold')
      this.pdf.setTextColor(15, 23, 42)
      this.pdf.text(String(value), this.margins.left + maxKeyWidth, this.currentY)

      this.currentY += 6
    })

    this.currentY += 8
  }

  // Add professional table
  addTable(headers: string[], rows: (string | number)[][], options?: {
    title?: string
    showBorder?: boolean
    alternateRows?: boolean
    headerColor?: [number, number, number]
    textSize?: number
  }): void {
    if (options?.title) {
      this.addSectionHeader(options.title)
    }

    // Use the imported autoTable function directly
    autoTable(this.pdf, {
      head: [headers],
      body: rows,
      startY: this.currentY,
      margin: { left: this.margins.left, right: this.margins.right },
      styles: {
        fontSize: options?.textSize || 9,
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: options?.headerColor || [248, 250, 252],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: options?.alternateRows !== false ? {
        fillColor: [249, 250, 251]
      } : undefined,
      didDrawPage: (data) => {
        this.currentY = data.cursor!.y + 10
      }
    })
  }

  // Add statistics cards
  addStatsCards(stats: { label: string; value: string | number; color?: string }[]): void {
    this.ensureSpace(40)

    const cardWidth = (this.pageWidth - this.margins.left - this.margins.right - 20) / Math.min(stats.length, 3)
    const cardHeight = 25

    stats.forEach((stat, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      const x = this.margins.left + col * (cardWidth + 10)
      const y = this.currentY + row * (cardHeight + 10)

      // Card background
      this.pdf.setFillColor(249, 250, 251)
      this.pdf.setDrawColor(226, 232, 240)
      this.pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD')

      // Value
      this.pdf.setTextColor(15, 23, 42)
      this.pdf.setFontSize(16)
      this.pdf.setFont('helvetica', 'bold')
      this.pdf.text(String(stat.value), x + cardWidth / 2, y + 10, { align: 'center' })

      // Label
      this.pdf.setTextColor(100, 116, 139)
      this.pdf.setFontSize(8)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.text(stat.label, x + cardWidth / 2, y + 18, { align: 'center' })
    })

    const rows = Math.ceil(stats.length / 3)
    this.currentY += rows * (cardHeight + 10) + 10
  }

  // Add summary box
  addSummaryBox(title: string, items: { label: string; value: string }[]): void {
    this.ensureSpace(items.length * 8 + 20)

    // Box background
    this.pdf.setFillColor(248, 250, 252)
    this.pdf.setDrawColor(226, 232, 240)
    const boxHeight = items.length * 8 + 15
    this.pdf.roundedRect(this.margins.left, this.currentY, this.pageWidth - this.margins.left - this.margins.right, boxHeight, 3, 3, 'FD')

    // Title
    this.pdf.setTextColor(15, 23, 42)
    this.pdf.setFontSize(12)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.text(title, this.margins.left + 10, this.currentY + 10)

    let itemY = this.currentY + 18

    items.forEach(item => {
      this.pdf.setFontSize(9)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setTextColor(100, 116, 139)
      this.pdf.text(item.label, this.margins.left + 10, itemY)

      this.pdf.setFont('helvetica', 'bold')
      this.pdf.setTextColor(15, 23, 42)
      this.pdf.text(item.value, this.pageWidth - this.margins.right - 10, itemY, { align: 'right' })

      itemY += 8
    })

    this.currentY += boxHeight + 10
  }

  // Add space or new page if needed
  private ensureSpace(height: number): void {
    if (this.currentY + height > this.pageHeight - this.margins.bottom - 20) {
      this.addPage()
    }
  }

  // Add new page
  addPage(): void {
    this.pdf.addPage()
    this.currentY = this.margins.top + 10
  }

  // Add footer to all pages
  addFooter(footer: PDFFooter): void {
    const pageCount = this.pdf.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i)

      const footerY = this.pageHeight - this.margins.bottom + 10

      // Footer line
      this.pdf.setDrawColor(226, 232, 240)
      this.pdf.setLineWidth(0.3)
      this.pdf.line(this.margins.left, footerY - 5, this.pageWidth - this.margins.right, footerY - 5)

      this.pdf.setFontSize(8)
      this.pdf.setTextColor(100, 116, 139)
      this.pdf.setFont('helvetica', 'normal')

      // Left side - Copyright
      this.pdf.text(
        `© ${new Date().getFullYear()} Dranoel Consults Limited. All rights reserved.`,
        this.margins.left,
        footerY
      )

      // Center - Custom text or date
      if (footer.customText) {
        this.pdf.text(footer.customText, this.pageWidth / 2, footerY, { align: 'center' })
      } else if (footer.showDate !== false) {
        this.pdf.text(
          `Generated: ${new Date().toLocaleDateString('en-UG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          this.pageWidth / 2,
          footerY,
          { align: 'center' }
        )
      }

      // Right side - Page numbers
      if (footer.showPageNumbers !== false) {
        this.pdf.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margins.right, footerY, { align: 'right' })
      }

      // Confidential notice
      if (footer.confidential) {
        this.pdf.setFontSize(7)
        this.pdf.setTextColor(220, 38, 38) // Red
        this.pdf.text('CONFIDENTIAL DOCUMENT', this.pageWidth / 2, footerY + 6, { align: 'center' })
      }
    }
  }

  // Save the PDF
  save(filename?: string): void {
    const defaultFilename = `dranoel_document_${new Date().toISOString().split('T')[0]}.pdf`
    this.pdf.save(filename || defaultFilename)
  }

  // Get the PDF instance for advanced operations
  getPDF(): jsPDF {
    return this.pdf
  }
}