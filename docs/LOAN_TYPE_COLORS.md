# Loan Type Color System Documentation

## Overview

The Dranoel Financial Loan Management System implements a consistent color-coding system for loan types across all user interfaces. This system improves user experience by providing visual cues for quick loan type identification.

## Color Scheme

| Loan Type | Enum Value | Color | Material-UI Color | Hex Code | Usage Context |
|-----------|------------|-------|-------------------|----------|---------------|
| Personal  | `PERSONAL` | Blue | `primary` | `#1976d2` | Individual consumer loans |
| Business  | `BUSINESS` | Green | `success` | `#2e7d32` | Commercial lending |
| Mortgage  | `MORTGAGE` | Light Blue | `info` | `#0288d1` | Property financing |
| Auto      | `AUTO` | Orange | `warning` | `#f57c00` | Vehicle loans |
| Student   | `STUDENT` | Purple | `secondary` | `#9c27b0` | Education loans |
| Payday    | `PAYDAY` | Red | `error` | `#d32f2f` | Emergency loans |

## Implementation

### 1. Color Function Pattern

Each page that displays loan types implements a `getLoanTypeColor()` function:

```typescript
const getLoanTypeColor = (loanType: string) => {
  switch (loanType) {
    case 'PERSONAL':
      return 'primary'
    case 'BUSINESS':
      return 'success'
    case 'MORTGAGE':
      return 'info'
    case 'AUTO':
      return 'warning'
    case 'STUDENT':
      return 'secondary'
    case 'PAYDAY':
      return 'error'
    default:
      return 'default'
  }
}
```

### 2. Chip Component Usage

Most loan type displays use Material-UI Chip components:

```tsx
<Chip
  label={loanType}
  color={getLoanTypeColor(loanType) as any}
  size="small"
  variant="filled" // or "outlined"
/>
```

### 3. Chart Implementation

For charts (Recharts), specific hex colors are used:

```typescript
const getLoanTypeColor = (type: string) => {
  const colors: { [key: string]: string } = {
    'PERSONAL': '#1976d2',    // Primary blue
    'BUSINESS': '#2e7d32',    // Success green
    'STUDENT': '#9c27b0',     // Secondary purple
    'MORTGAGE': '#0288d1',    // Info blue
    'AUTO': '#f57c00',        // Warning orange
    'PAYDAY': '#d32f2f'       // Error red
  }
  return colors[type] || '#757575' // Default grey
}
```

## File Locations

### Pages with Color Implementation

1. **Loan Requests Page**: `src/app/officer/loan-requests/page.tsx`
   - Table display with filled chips
   - Color function: `getLoanTypeColor()`

2. **Officer Dashboard**: `src/app/officer/dashboard/page.tsx`
   - Recent loans table with filled chips
   - Color function: `getLoanTypeColor()`

3. **Statistics Page**: `src/app/officer/statistics/page.tsx`
   - Pie chart with custom colors
   - Color function: `getLoanTypeColor()` (hex values)

4. **Loans Page**: `src/app/loans/page.tsx`
   - Loan cards with outlined chips
   - Detail dialog with filled chips
   - Color function: `getLoanTypeColor()`

5. **Statements Page**: `src/app/statements/loans/page.tsx`
   - Loan details with filled chips
   - Color function: `getLoanTypeColor()`

## Data Flow

### Database → Display

1. **Database Storage**: Loan types stored as enum values (`PERSONAL`, `BUSINESS`, etc.)
2. **API Response**: Enum values passed through API responses
3. **Frontend Processing**:
   - Service layer may transform to display strings ("Personal Loan")
   - Color functions use enum values for consistency
4. **UI Display**: Chips with consistent colors across pages

### Service Layer

The `LoanRequestsService` (`src/lib/loanRequestsService.ts`) handles transformation between database enums and display strings:

```typescript
// Transform database enum to display string
private static mapDatabaseLoanType(dbType: string): string {
  const typeMap: { [key: string]: string } = {
    'PERSONAL': 'Personal Loan',
    'BUSINESS': 'Business Loan',
    'STUDENT': 'Education Loan',
    'MORTGAGE': 'Mortgage Loan',
    'AUTO': 'Auto Loan'
  }
  return typeMap[dbType] || dbType
}
```

## Best Practices

### 1. Consistency
- Always use the same color for the same loan type across all pages
- Use the standard `getLoanTypeColor()` function pattern
- Maintain consistent chip variants (filled for emphasis, outlined for subtle)

### 2. Accessibility
- Colors chosen provide sufficient contrast for readability
- Text labels always accompany colors (never color-only information)
- Default fallback color for unknown types

### 3. Maintainability
- Centralized color definitions in each component
- Clear mapping between enum values and colors
- Consistent function naming across components

## Adding New Loan Types

To add a new loan type:

1. **Database**: Add new enum value to Prisma schema
2. **API**: Update any relevant API endpoints
3. **Service**: Update `mapDatabaseLoanType()` if needed
4. **Components**: Add new case to each `getLoanTypeColor()` function
5. **Documentation**: Update this file and README.md

## Troubleshooting

### Common Issues

1. **Wrong Colors**: Check enum value matches in color function
2. **Missing Colors**: Ensure all pages have updated color functions
3. **TypeScript Errors**: Use `as any` type assertion for Material-UI color prop
4. **Chart Colors**: Use hex values instead of Material-UI color names for Recharts

### Testing

- Verify colors appear correctly on all listed pages
- Test with different loan types
- Check color consistency across pages
- Validate accessibility with color contrast tools