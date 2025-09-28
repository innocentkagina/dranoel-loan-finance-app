# Dranoel - Financial Loan Management System

A comprehensive financial loan management application built with Next.js, TypeScript, Prisma, and Material-UI.

## Features

### Core Functionality
- **User Authentication & Authorization** - Multi-role system (Borrower, Loan Officer, Underwriter, Admin)
- **Loan Application Management** - Complete application workflow with document upload
- **Payment Processing** - Payment tracking, schedules, and status management
- **Document Management** - Secure document upload, verification, and storage
- **Notification System** - Real-time updates on loan and payment status
- **Analytics Dashboard** - Comprehensive reporting and performance metrics
- **Loan Calculations** - Interest rate calculations, payment schedules, and eligibility assessment

### User Roles
- **Borrower** - Apply for loans, make payments, track application status
- **Loan Officer** - Review applications, approve/reject loans, manage customer relationships
- **Underwriter** - Perform detailed risk assessment and final approval decisions
- **Admin** - Full system access, user management, system configuration
- **Manager** - Oversight and analytics access
- **Treasurer** - Financial management, payment processing, deposits & withdrawals, reports & analytics

### Loan Types Supported
- **Personal Loans** - Individual consumer loans
- **Mortgage Loans** - Property financing
- **Auto Loans** - Vehicle financing
- **Business Loans** - Commercial lending
- **Student Loans** - Education financing
- **Payday Loans** - Short-term emergency loans

### UI/UX Features
- **Color-Coded Loan Types** - Visual identification system for quick loan type recognition
- **Responsive Design** - Mobile-first approach with Material-UI components
- **Interactive Charts** - Data visualization with Recharts for analytics
- **Real-time Updates** - Live status updates and notifications
- **Intuitive Navigation** - Role-based menus and breadcrumb navigation

## Loan Type Color System

The application uses a consistent color-coding system across all pages to help users quickly identify different loan types:

| Loan Type | Color | Material-UI Color | Usage |
|-----------|-------|-------------------|-------|
| **PERSONAL** | 🔵 Blue | `primary` | Individual consumer loans |
| **BUSINESS** | 🟢 Green | `success` | Commercial and business loans |
| **MORTGAGE** | 🔷 Light Blue | `info` | Property and real estate loans |
| **AUTO** | 🟠 Orange | `warning` | Vehicle financing loans |
| **STUDENT** | 🟣 Purple | `secondary` | Education financing loans |
| **PAYDAY** | 🔴 Red | `error` | Emergency short-term loans |

### Implementation
- **Chip Components**: Used in tables, cards, and detail views
- **Chart Colors**: Consistent colors in pie charts and bar charts
- **Visual Consistency**: Same colors across all pages and components
- **Accessibility**: High contrast colors for better readability

### Pages with Color-Coded Loan Types
- ✅ **Loan Requests Page** (`/officer/loan-requests`) - Table display
- ✅ **Officer Dashboard** (`/officer/dashboard`) - Recent loans table
- ✅ **Statistics Page** (`/officer/statistics`) - Charts and analytics
- ✅ **Loans Page** (`/loans`) - Loan cards and detail dialogs
- ✅ **Statements Page** (`/statements/loans`) - Loan details
- ✅ **Treasurer Reports** (`/treasurer/reports`) - Enhanced charts and analytics

📋 **For detailed implementation guide, see** → [`docs/LOAN_TYPE_COLORS.md`](./docs/LOAN_TYPE_COLORS.md)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Material-UI (MUI), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Icons**: Material-UI Icons, React Icons

## Demo Accounts

After seeding the database, you can use these demo accounts:

- **Admin**: admin@dranoel.com / admin123
- **Loan Officer**: officer@dranoel.com / officer123
- **Underwriter**: underwriter@dranoel.com / underwriter123
- **Borrower**: borrower@dranoel.com / borrower123

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Copy `.env.example` to `.env.local` and update with your database configuration

3. **Set up the database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## Recent Updates

### Treasurer Module Enhancements

#### UI/UX Improvements (Charts Section)
- **Space-Friendly Charts**: Redesigned charts section with optimized spacing and layout for better visual hierarchy
- **Modern UI Design**: Enhanced with gradients, hover effects, and improved Material-UI styling
- **Responsive Grid**: Implemented compact grid layout for better space utilization
- **Interactive Elements**: Added smooth transitions and hover animations

#### Navigation Fixes
- **Breadcrumb Navigation**: Fixed duplicate breadcrumb issue on treasurer pages
- **Authentication Handling**: Resolved redirect issues when refreshing treasurer pages
- **Role-Based Navigation**: Streamlined navigation by removing unnecessary intermediate pages

#### Technical Improvements
- **Session Management**: Enhanced authentication logic with proper loading state handling
- **Path Handling**: Improved breadcrumb generation logic to prevent duplicate entries
- **Component Structure**: Optimized component hierarchy and styling patterns

#### Pages Enhanced
- ✅ **Treasurer Dashboard** (`/treasurer/dashboard`) - Fixed authentication and navigation
- ✅ **Payment Processing** (`/treasurer/payments`) - Enhanced session handling
- ✅ **Deposits & Withdrawals** (`/treasurer/deposits`) - Improved authentication logic
- ✅ **Reports & Analytics** (`/treasurer/reports`) - Major UI/UX overhaul with space-friendly charts

## Key Features

- **Complete loan application workflow** - End-to-end application processing
- **Multi-role authentication system** - Role-based access control
- **Payment tracking and management** - Comprehensive payment processing
- **Document upload and verification** - Secure document management
- **Real-time notifications** - Instant status updates
- **Comprehensive analytics dashboard** - Data visualization and reporting
- **Interest rate calculations** - Automated financial calculations
- **Payment schedule generation** - Automatic payment plan creation
- **Color-coded loan type system** - Visual identification for improved UX
- **Responsive design** - Mobile-first approach with Material-UI

## Security

- Role-based access control
- Secure authentication with NextAuth.js
- Input validation and sanitization
- Audit logging for compliance
- Secure file upload handling
