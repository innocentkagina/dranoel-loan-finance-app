'use client'

import { Box, Typography } from '@mui/material'
import { AccountBalance as BankIcon } from '@mui/icons-material'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'full' | 'icon' | 'text'
  color?: 'primary' | 'white' | 'inherit'
}

export default function Logo({ size = 'medium', variant = 'full', color = 'primary' }: LogoProps) {
  const sizes = {
    small: { icon: 24, text: 'h6' },
    medium: { icon: 32, text: 'h5' },
    large: { icon: 40, text: 'h4' }
  } as const

  const colors = {
    primary: {
      icon: 'primary.main',
      text: 'primary.main',
      gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
    },
    white: {
      icon: 'white',
      text: 'white',
      gradient: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
    },
    inherit: {
      icon: 'inherit',
      text: 'inherit',
      gradient: 'inherit'
    }
  }

  if (variant === 'icon') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          background: colors[color].gradient,
          p: 1,
          boxShadow: color === 'primary' ? 2 : 0
        }}
      >
        <BankIcon
          sx={{
            fontSize: sizes[size].icon,
            color: color === 'primary' ? 'white' : colors[color].icon
          }}
        />
      </Box>
    )
  }

  if (variant === 'text') {
    return (
      <Typography
        variant={sizes[size].text}
        sx={{
          fontWeight: 700,
          color: colors[color].text,
          background: color === 'primary' ? colors[color].gradient : 'inherit',
          backgroundClip: color === 'primary' ? 'text' : 'inherit',
          WebkitBackgroundClip: color === 'primary' ? 'text' : 'inherit',
          WebkitTextFillColor: color === 'primary' ? 'transparent' : 'inherit',
          letterSpacing: '-0.02em'
        }}
      >
        DRANOEL
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {/* Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          background: colors[color].gradient,
          p: 1,
          boxShadow: color === 'primary' ? 2 : 0
        }}
      >
        <BankIcon
          sx={{
            fontSize: sizes[size].icon,
            color: color === 'primary' ? 'white' : colors[color].icon
          }}
        />
      </Box>

      {/* Text */}
      <Box>
        <Typography
          variant={sizes[size].text}
          sx={{
            fontWeight: 700,
            color: colors[color].text,
            lineHeight: 1,
            letterSpacing: '-0.02em'
          }}
        >
          DRANOEL
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: color === 'white' ? 'rgba(255,255,255,0.8)' : 'text.secondary',
            fontSize: '0.65rem',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          Financial Services
        </Typography>
      </Box>
    </Box>
  )
}