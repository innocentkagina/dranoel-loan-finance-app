'use client'

import React from 'react'
import { Button, Box, Typography } from '@mui/material'
import { PDFTemplate, PDFConfig } from '@/lib/pdf-templates'
import {
  generateLoanStatementPDF,
  generateFinancialReportPDF,
  generateMemberStatementPDF,
  generatePaymentReceiptPDF,
  LoanStatementData,
  FinancialReportData,
  MemberStatementData,
  PaymentReceiptData
} from '@/lib/pdf-generators'

export default function PDFTest() {
  const testBasicPDF = () => {
    const config: PDFConfig = {
      title: 'Test Document',
      filename: 'test.pdf',
      author: 'Dranoel Test',
    }

    const pdf = new PDFTemplate(config)

    // Add header
    pdf.addHeader({
      title: 'Dranoel Consults Limited',
      subtitle: 'Test Document Generation',
      address: ['Plot 123, Financial District', 'Kampala, Uganda'],
      phone: '+256 700 123 456',
      email: 'info@dranoel.com',
      website: 'www.dranoel.com'
    })

    // Add title
    pdf.addTitle('Test Document', 'Testing PDF Generation System')

    // Add section
    pdf.addSectionHeader('Test Section')

    // Add key-value pairs
    pdf.addKeyValuePairs({
      'Document Type': 'Test PDF',
      'Generated On': new Date().toLocaleDateString(),
      'Status': 'Active',
      'Version': '1.0'
    })

    // Add test table
    const headers = ['Item', 'Description', 'Amount']
    const rows = [
      ['Item 1', 'Test item description', '10,000'],
      ['Item 2', 'Another test item', '25,000'],
      ['Item 3', 'Final test item', '15,000']
    ]

    pdf.addTable(headers, rows, {
      title: 'Test Table',
      alternateRows: true
    })

    // Add statistics cards
    pdf.addStatsCards([
      { label: 'Total Items', value: '3' },
      { label: 'Total Amount', value: '50,000' },
      { label: 'Average', value: '16,667' },
      { label: 'Status', value: 'Complete' }
    ])

    // Add summary
    pdf.addSummaryBox('Summary', [
      { label: 'Document Generated', value: 'Successfully' },
      { label: 'Template System', value: 'Working' },
      { label: 'autoTable Plugin', value: 'Functional' }
    ])

    // Add footer and save
    pdf.addFooter({
      showPageNumbers: true,
      showDate: true,
      confidential: false
    })

    pdf.save('test-document.pdf')
  }

  const testLoanStatement = () => {
    const testData: LoanStatementData = {
      borrower: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+256 700 123 456',
        address: 'Kampala, Uganda',
        memberId: 'M001'
      },
      loan: {
        accountNumber: 'LN001',
        loanType: 'PERSONAL',
        principalAmount: 1000000,
        currentBalance: 750000,
        interestRate: 15,
        termMonths: 12,
        monthlyPayment: 90000,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        nextPaymentDate: '2024-02-01',
        status: 'ACTIVE'
      },
      payments: [
        {
          date: '2024-01-15',
          amount: 90000,
          principalAmount: 75000,
          interestAmount: 15000,
          balance: 925000,
          status: 'PAID'
        }
      ],
      summary: {
        totalPaid: 250000,
        totalInterestPaid: 50000,
        principalPaid: 200000,
        remainingBalance: 750000,
        paymentsRemaining: 9
      }
    }

    generateLoanStatementPDF(testData)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        PDF System Test
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Test the enhanced PDF generation system
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={testBasicPDF}>
          Test Basic PDF
        </Button>

        <Button variant="contained" onClick={testLoanStatement}>
          Test Loan Statement
        </Button>
      </Box>
    </Box>
  )
}