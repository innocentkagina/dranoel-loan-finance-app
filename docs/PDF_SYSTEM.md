# Enhanced PDF System Documentation

## Overview

The Dranoel app now features a comprehensive PDF generation system that creates professional, branded documents with proper formatting, layouts, and templates for different document types.

## ✅ Features

- **Professional Templates**: Beautiful, branded PDF layouts with Dranoel branding
- **Multiple Document Types**: Loan statements, financial reports, member statements, payment receipts
- **High-Quality Output**: Vector graphics and proper typography
- **Multi-page Support**: Automatic page breaks and pagination
- **Loading Integration**: Seamless integration with the global loading system
- **Print Support**: Both PDF download and direct printing capabilities

## 🏗️ Architecture

### Core Components

1. **PDFTemplate** (`src/lib/pdf-templates.ts`)
   - Base PDF template class with professional layouts
   - Handles headers, footers, sections, tables, and charts
   - Automatic page management and spacing

2. **PDF Generators** (`src/lib/pdf-generators.ts`)
   - Specific generators for different document types
   - Data formatting and validation
   - Currency and date formatting utilities

3. **PDFButton Component** (`src/components/PDFButton.tsx`)
   - React component for triggering PDF generation
   - Dropdown support for multiple actions
   - Loading state integration

4. **Enhanced usePrintAndPdf Hook** (`src/hooks/usePrintAndPdf.ts`)
   - Supports both legacy HTML-to-canvas and new template methods
   - Loading state management
   - Error handling

## 📄 Document Templates

### 1. Loan Statement PDF
```typescript
generateLoanStatementPDF(data: LoanStatementData)
```

**Features:**
- Borrower information section
- Loan details and terms
- Payment history table
- Balance summary cards
- Professional branding

**Data Structure:**
```typescript
interface LoanStatementData {
  borrower: {
    name: string
    email: string
    phone: string
    address: string
    memberId: string
  }
  loan: {
    accountNumber: string
    loanType: string
    principalAmount: number
    currentBalance: number
    interestRate: number
    termMonths: number
    monthlyPayment: number
    startDate: string
    maturityDate: string
    nextPaymentDate: string
    status: string
  }
  payments: Array<{
    date: string
    amount: number
    principalAmount: number
    interestAmount: number
    balance: number
    status: string
  }>
  summary: {
    totalPaid: number
    totalInterestPaid: number
    principalPaid: number
    remainingBalance: number
    paymentsRemaining: number
  }
}
```

### 2. Financial Report PDF
```typescript
generateFinancialReportPDF(data: FinancialReportData)
```

**Features:**
- Portfolio overview with statistics
- Performance metrics
- Loan distribution tables
- Risk analysis section
- Landscape orientation for better table display

### 3. Member Statement PDF
```typescript
generateMemberStatementPDF(data: MemberStatementData)
```

**Features:**
- Member information
- Account balances (savings, shares, loans)
- Transaction history
- Net worth calculation

### 4. Payment Receipt PDF
```typescript
generatePaymentReceiptPDF(data: PaymentReceiptData)
```

**Features:**
- Official receipt format
- Payment breakdown
- Transaction details
- Compact, receipt-style layout

## 🚀 Usage Examples

### Basic PDF Generation
```tsx
import { generateLoanStatementPDF, LoanStatementData } from '@/lib/pdf-generators'

const handleGeneratePDF = () => {
  const data: LoanStatementData = {
    // ... your data
  }
  generateLoanStatementPDF(data)
}
```

### Using PDFButton Component
```tsx
import PDFButton from '@/components/PDFButton'

<PDFButton
  data={loanStatementData}
  type="loan-statement"
  title="Loan Statement"
  filename="loan_statement_2024.pdf"
  variant="contained"
  size="medium"
  showDropdown={true}
  enablePrint={true}
/>
```

### Using Enhanced Hook
```tsx
import { usePrintAndPdf } from '@/hooks/usePrintAndPdf'

const { printRef, handlePrint, handleDownloadPdf } = usePrintAndPdf({
  title: 'My Document',
  filename: 'document.pdf',
  useEnhancedPDF: true // Use new template system
})

return (
  <div>
    <div ref={printRef}>
      {/* Your content to print/convert to PDF */}
    </div>
    <button onClick={handleDownloadPdf}>Download PDF</button>
    <button onClick={handlePrint}>Print</button>
  </div>
)
```

## 🎨 Styling and Branding

### Brand Colors
- **Primary**: Deep slate blue (#0F172A)
- **Secondary**: Vibrant orange (#F97316)
- **Success**: Emerald green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Error**: Red (#EF4444)

### Typography
- **Font Family**: Helvetica (with fallbacks)
- **Headers**: Bold weights for emphasis
- **Body Text**: Regular weight, good line spacing
- **Small Text**: Used for metadata and footers

### Layout Elements
- **Logo**: Orange rounded rectangle with white "D"
- **Headers**: Company info with contact details
- **Footers**: Copyright, generation date, page numbers
- **Sections**: Clear hierarchy with colored underlines
- **Tables**: Alternating row colors, proper spacing
- **Cards**: Statistics displayed in card format

## 📋 Integration Guide

### 1. Install Dependencies
```bash
npm install jspdf jspdf-autotable html2canvas
```

### 2. Import Required Files
```typescript
import { generateLoanStatementPDF } from '@/lib/pdf-generators'
import PDFButton from '@/components/PDFButton'
```

### 3. Prepare Your Data
Convert your application data to match the required interfaces.

### 4. Add PDF Buttons
Replace existing print/download buttons with the new PDFButton component.

### 5. Test Different Document Types
Ensure all document types generate correctly with your data.

## 🔧 Customization

### Adding New Document Types

1. **Define Data Interface**
```typescript
interface MyDocumentData {
  // Define your data structure
}
```

2. **Create Generator Function**
```typescript
export function generateMyDocumentPDF(data: MyDocumentData): void {
  const config: PDFConfig = {
    title: 'My Document',
    filename: 'my_document.pdf'
  }

  const pdf = new PDFTemplate(config)

  // Add content using template methods
  pdf.addHeader(getDranoelHeader())
  pdf.addTitle('My Document Title')
  // ... more content

  pdf.addFooter(getDranoelFooter())
  pdf.save()
}
```

3. **Update PDFButton Component**
Add your new document type to the PDFButton component's type union and switch statement.

### Customizing Templates

The PDFTemplate class provides methods for:
- `addHeader()`: Company header with logo and contact info
- `addTitle()`: Document title and subtitle
- `addSectionHeader()`: Section dividers
- `addKeyValuePairs()`: Information rows
- `addTable()`: Professional tables with autoTable
- `addStatsCards()`: Statistics in card format
- `addSummaryBox()`: Highlighted summary information
- `addFooter()`: Professional footer with branding

## 🐛 Troubleshooting

### Common Issues

1. **PDF Not Generating**
   - Check data format matches interface
   - Ensure all required fields are provided
   - Check browser console for errors

2. **Poor Quality Output**
   - Increase scale parameter in html2canvas options
   - Use vector elements where possible
   - Ensure proper image resolution

3. **Layout Issues**
   - Test with different data sizes
   - Adjust margins and spacing
   - Check page break logic

4. **Missing Dependencies**
   - Ensure jspdf-autotable is installed
   - Check import statements
   - Verify package versions

### Performance Tips

1. **Optimize Large Datasets**
   - Paginate large transaction lists
   - Limit table rows per page
   - Use summary statistics for overview

2. **Memory Management**
   - Generate PDFs on-demand
   - Don't store PDF data in state
   - Clean up canvas elements

3. **User Experience**
   - Always show loading states
   - Provide progress feedback
   - Handle errors gracefully

## 📊 Quality Standards

### Generated PDFs Include:
- ✅ Professional branding and layout
- ✅ Proper typography and spacing
- ✅ Consistent color scheme
- ✅ Page numbers and metadata
- ✅ Responsive table layouts
- ✅ High-resolution output
- ✅ Multi-page support
- ✅ Proper error handling
- ✅ Loading state integration
- ✅ Print compatibility

The enhanced PDF system transforms your Dranoel app's document generation capabilities, providing users with professional, branded documents that reflect the quality and reliability of your financial services platform.