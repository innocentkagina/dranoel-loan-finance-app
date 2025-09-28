'use client'

import React from 'react'
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  KeyboardArrowDown as DropdownIcon,
  Receipt as ReceiptIcon,
  Description as StatementIcon,
  Assessment as ReportIcon
} from '@mui/icons-material'
import { useLoading } from '@/contexts/LoadingContext'
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
import { usePrintAndPdf } from '@/hooks/usePrintAndPdf'

interface PDFButtonProps {
  data?: any
  type: 'loan-statement' | 'financial-report' | 'member-statement' | 'payment-receipt' | 'general'
  title?: string
  filename?: string
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  showDropdown?: boolean
  enablePrint?: boolean
}

export default function PDFButton({
  data,
  type,
  title = 'Document',
  filename,
  variant = 'outlined',
  size = 'medium',
  showDropdown = false,
  enablePrint = true
}: PDFButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const { withLoading } = useLoading()
  const { printRef, handlePrint } = usePrintAndPdf({
    title,
    filename,
    useEnhancedPDF: true
  })

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleDownloadPDF = async () => {
    await withLoading(async () => {
      try {
        switch (type) {
          case 'loan-statement':
            if (data) generateLoanStatementPDF(data as LoanStatementData)
            break
          case 'financial-report':
            if (data) generateFinancialReportPDF(data as FinancialReportData)
            break
          case 'member-statement':
            if (data) generateMemberStatementPDF(data as MemberStatementData)
            break
          case 'payment-receipt':
            if (data) generatePaymentReceiptPDF(data as PaymentReceiptData)
            break
          case 'general':
            // For general HTML content, you'd use the usePrintAndPdf hook directly
            break
        }
      } catch (error) {
        console.error('Error generating PDF:', error)
        // You could show a toast notification here
      }
    }, 'Generating PDF...')

    handleMenuClose()
  }

  const getIcon = () => {
    switch (type) {
      case 'loan-statement':
      case 'member-statement':
        return <StatementIcon />
      case 'financial-report':
        return <ReportIcon />
      case 'payment-receipt':
        return <ReceiptIcon />
      default:
        return <PdfIcon />
    }
  }

  if (showDropdown) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          startIcon={getIcon()}
          endIcon={<DropdownIcon />}
          onClick={handleMenuOpen}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Download PDF
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={handleDownloadPDF}>
            <ListItemIcon>
              <PdfIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Download as PDF" />
          </MenuItem>

          {enablePrint && (
            <MenuItem onClick={() => { handlePrint(); handleMenuClose(); }}>
              <ListItemIcon>
                <PrintIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Print Document" />
            </MenuItem>
          )}
        </Menu>
      </>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={getIcon()}
      onClick={handleDownloadPDF}
      sx={{
        textTransform: 'none',
        fontWeight: 500,
      }}
    >
      Download PDF
    </Button>
  )
}