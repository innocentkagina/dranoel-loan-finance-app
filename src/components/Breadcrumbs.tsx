'use client'

import { usePathname } from 'next/navigation'
import { Breadcrumbs as MUIBreadcrumbs, Link, Typography, Box } from '@mui/material'
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  AccountBalance as LoanIcon,
  Payment as PaymentIcon,
  Assignment as ApplicationIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Gavel as OfficerIcon,
  Receipt as StatementIcon,
  Savings as SavingsIcon,
  MoneyOff as WithdrawalIcon,
  AccountBalance as BankIcon,
  Assessment as ReportsIcon,
  Security as AdminIcon,
  Storage as DatabaseIcon,
  Timeline as AuditIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import NextLink from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[]
}

export default function Breadcrumbs({ customItems }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Define route mappings for better labels
  const routeLabels: Record<string, string> = {
    '/': 'Home',
    '/member/loans': 'Loans',
    '/member/loan-application': 'Apply for Loan',
    '/member/payments': 'Payments',
    '/member/profile': 'Profile',
    '/administrator/analytics': 'Analytics',
    '/auth/signin': 'Sign In',
    '/auth/signup': 'Sign Up',
    // Loan Officer Routes
    '/officer': 'Officer Panel',
    '/officer/dashboard': 'Officer Dashboard',
    '/officer/loan-requests': 'Loan Applications',
    '/officer/member-statements': 'Member Statements',
    '/officer/statistics': 'Statistics',
    // Treasurer Routes
    '/treasurer': 'Treasurer Panel',
    '/treasurer/dashboard': 'Treasurer Dashboard',
    '/treasurer/payments': 'Payment Processing',
    '/treasurer/deposits': 'Deposits & Withdrawals',
    '/treasurer/reports': 'Reports & Analytics',
    // Member Routes
    '/member': 'Member Panel',
    '/member/dashboard': 'Member Dashboard',
    '/member/loans': 'My Loans',
    // Administrator Routes
    '/administrator': 'Administrator Dashboard',
    '/administrator/users': 'User Management',
    '/administrator/audit': 'Audit Trail',
    '/administrator/database': 'Database Operations',
    '/administrator/reports': 'System Reports',
    '/administrator/settings': 'System Settings',
    '/administrator/profile': 'Admin Profile',
    // Member Services Routes
    '/withdrawal-request': 'Withdrawal Request',
    '/member/statements': 'Statements',
    '/member/statements/savings': 'Savings Statement',
    '/member/statements/shares': 'Share Statement',
    '/member/statements/loans': 'Loan Statement',
  }

  // Define route icons
  const routeIcons: Record<string, React.ReactNode> = {
    '/member/loans': <LoanIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/payments': <PaymentIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/loan-application': <ApplicationIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/profile': <PersonIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/analytics': <AnalyticsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    // Loan Officer Routes
    '/officer': <OfficerIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/officer/dashboard': <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/officer/loan-requests': <ApplicationIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/officer/member-statements': <PeopleIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/officer/statistics': <AnalyticsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    // Treasurer Routes
    '/treasurer': <BankIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/treasurer/dashboard': <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/treasurer/payments': <PaymentIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/treasurer/deposits': <SavingsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/treasurer/reports': <ReportsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    // Member Routes
    '/member': <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/dashboard': <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/loans': <LoanIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    // Administrator Routes
    '/administrator': <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/users': <PeopleIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/audit': <AuditIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/database': <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/reports': <ReportsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/settings': <SettingsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/administrator/profile': <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    // Member Services Routes
    '/withdrawal-request': <WithdrawalIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/statements': <StatementIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/statements/savings': <SavingsIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/statements/shares': <StatementIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
    '/member/statements/loans': <LoanIcon sx={{ mr: 0.5 }} fontSize="inherit" />,
  }

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems
    }

    // Split pathname into segments
    const pathSegments = pathname.split('/').filter(segment => segment !== '')

    // Always start with dashboard for authenticated pages
    const breadcrumbs: BreadcrumbItem[] = []

    // Add appropriate dashboard as home for most pages
    if (pathname !== '/member/dashboard' && pathname !== '/officer/dashboard' && pathname !== '/treasurer/dashboard' && pathname !== '/administrator' && pathname !== '/' && !pathname.startsWith('/auth')) {
      if (pathname.startsWith('/officer')) {
        breadcrumbs.push({
          label: 'Officer Dashboard',
          href: '/officer/dashboard',
          icon: <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        })
      } else if (pathname.startsWith('/treasurer')) {
        // For treasurer sub-pages, add treasurer dashboard as root
        breadcrumbs.push({
          label: 'Treasurer Dashboard',
          href: '/treasurer/dashboard',
          icon: <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        })
      } else if (pathname.startsWith('/administrator')) {
        // For administrator sub-pages, add administrator dashboard as root
        breadcrumbs.push({
          label: 'Administrator Dashboard',
          href: '/administrator',
          icon: <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        })
      } else if (pathname.startsWith('/member')) {
        // For member sub-pages, add member dashboard as root
        breadcrumbs.push({
          label: 'Member Dashboard',
          href: '/member/dashboard',
          icon: <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        })
      } else {
        breadcrumbs.push({
          label: 'Dashboard',
          href: '/',
          icon: <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        })
      }
    }

    // Build breadcrumb trail
    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1

      // Skip the root segment for role-based pages if we already added it
      if ((pathname.startsWith('/officer') && segment === 'officer') ||
          (pathname.startsWith('/treasurer') && segment === 'treasurer') ||
          (pathname.startsWith('/administrator') && segment === 'administrator') ||
          (pathname.startsWith('/member') && segment === 'member')) {
        return
      }

      // Handle special cases for dynamic routes
      let label = routeLabels[currentPath] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      let icon = routeIcons[currentPath]

      // Special handling for dynamic routes
      if (pathSegments[pathSegments.length - 1] !== segment &&
          pathSegments.includes('loan-requests') &&
          /^[0-9]+$/.test(segment)) {
        label = `Loan Request #${segment}`
        icon = <ApplicationIcon sx={{ mr: 0.5 }} fontSize="inherit" />
      }

      // Special handling for user edit pages
      if (pathSegments.includes('users') && segment === 'edit') {
        label = 'Edit User'
        icon = <PeopleIcon sx={{ mr: 0.5 }} fontSize="inherit" />
      }

      // Special handling for user ID in administrator/users/[id]
      if (pathSegments.includes('administrator') &&
          pathSegments.includes('users') &&
          /^[a-zA-Z0-9]+$/.test(segment) &&
          segment !== 'users' &&
          segment !== 'edit') {
        label = `User Details`
        icon = <PeopleIcon sx={{ mr: 0.5 }} fontSize="inherit" />
      }

      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        icon
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs on home/dashboard or auth pages with single level
  if (pathname === '/' || pathname === '/member/dashboard' || pathname === '/officer/dashboard' || pathname === '/treasurer/dashboard' || pathname === '/administrator' ||
      (pathname.startsWith('/auth') && breadcrumbs.length <= 1)) {
    return null
  }

  return (
    <Box sx={{ mb: 2 }}>
      <MUIBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 1
          }
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1

          if (isLast || !item.href) {
            return (
              <Typography
                key={item.label}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: isLast ? 600 : 400
                }}
              >
                {item.icon}
                {item.label}
              </Typography>
            )
          }

          return (
            <Link
              key={item.label}
              component={NextLink}
              underline="hover"
              color="inherit"
              href={item.href}
              sx={{
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </MUIBreadcrumbs>
    </Box>
  )
}