'use client'

import React from 'react'
import { Box, CircularProgress, Typography, Fade } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Logo from './Logo'

interface GlobalLoaderProps {
  show: boolean
  message?: string
}

export default function GlobalLoader({ show, message = 'Loading...' }: GlobalLoaderProps) {
  const theme = useTheme()

  return (
    <Fade in={show} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        {/* Animated Logo */}
        <Box
          sx={{
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 0.8,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 1,
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <Logo size="large" variant="full" color="primary" />
        </Box>

        {/* Animated Progress Ring */}
        <Box sx={{ position: 'relative' }}>
          {/* Background circle */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={60}
            thickness={3}
            sx={{
              color: 'rgba(15, 23, 42, 0.1)',
              position: 'absolute',
            }}
          />
          {/* Animated progress circle */}
          <CircularProgress
            variant="indeterminate"
            disableShrink
            size={60}
            thickness={3}
            sx={{
              color: theme.palette.secondary.main,
              animationDuration: '1.4s',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        </Box>

        {/* Loading message */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            fontWeight: 500,
            animation: 'fadeInOut 2s ease-in-out infinite',
            '@keyframes fadeInOut': {
              '0%, 100%': { opacity: 0.7 },
              '50%': { opacity: 1 },
            },
          }}
        >
          {message}
        </Typography>

        {/* Animated dots */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            '& > div': {
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: theme.palette.secondary.main,
              animation: 'bounce 1.4s ease-in-out infinite both',
            },
            '& > div:nth-of-type(1)': { animationDelay: '-0.32s' },
            '& > div:nth-of-type(2)': { animationDelay: '-0.16s' },
            '& > div:nth-of-type(3)': { animationDelay: '0s' },
            '@keyframes bounce': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
              },
              '40%': {
                transform: 'scale(1)',
              },
            },
          }}
        >
          <div />
          <div />
          <div />
        </Box>
      </Box>
    </Fade>
  )
}