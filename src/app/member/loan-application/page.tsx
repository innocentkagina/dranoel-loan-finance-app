'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Container,
  LinearProgress,
} from '@mui/material'
import {
  Assignment as ApplicationIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import LoanApplicationModal from '@/components/LoanApplicationModal'
import Breadcrumbs from '@/components/Breadcrumbs'

export default function LoanApplicationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  // Check authentication status
  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
    } else if (session) {
      // Open the modal automatically when the page loads and user is authenticated
      setModalOpen(true)
    }
  }, [status, session, router])

  const handleCloseModal = () => {
    setModalOpen(false)
    // Navigate back to loans page when modal closes
    router.push('/loans')
  }

  if (status === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Loading...</Typography>
      </Container>
    )
  }

  if (!session) {
    return null // Will redirect to sign-in
  }

  return (
    <Box>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Breadcrumbs />
        <Typography variant="h4" gutterBottom>
          <ApplicationIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Loan Application
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Complete your loan application below. All fields marked with * are required.
        </Typography>
      </Container>

      <LoanApplicationModal
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </Box>
  )
}