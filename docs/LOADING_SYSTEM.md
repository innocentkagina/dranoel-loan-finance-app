# Global Loading System

A comprehensive loading system for the Dranoel application that provides smooth loading indicators during page transitions and API calls.

## Features

- ✅ **Global Page Loading**: Automatic loading indicators during route transitions
- ✅ **API Loading**: Easy-to-use hooks for API calls with loading states
- ✅ **Beautiful Animations**: Smooth animations with logo pulse, progress ring, and animated dots
- ✅ **Customizable Messages**: Different loading messages for different operations
- ✅ **TypeScript Support**: Full TypeScript support with proper types

## Components

### GlobalLoader
A beautiful full-screen loading overlay with:
- Animated Dranoel logo with pulse effect
- Circular progress indicator
- Custom loading messages
- Animated dots
- Backdrop blur effect

### LoadingContext
React context that manages global loading state with methods:
- `showLoader(message?)` - Show loading with optional message
- `hideLoader()` - Hide loading
- `withLoading(asyncFn, message?)` - Wrap async functions with loading

## Usage

### Automatic Page Loading
Page loading is automatically handled for all route transitions. No additional code needed!

### Manual API Loading
```tsx
import { useLoading } from '@/contexts/LoadingContext'

function MyComponent() {
  const { withLoading } = useLoading()

  const handleSubmit = async () => {
    await withLoading(async () => {
      const response = await fetch('/api/loans', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return response.json()
    }, 'Creating loan application...')
  }
}
```

### Using the API Hook
```tsx
import { useApi } from '@/hooks/useApi'

function MyComponent() {
  const { apiCall } = useApi()

  const fetchData = async () => {
    const data = await apiCall(
      () => fetch('/api/data').then(res => res.json()),
      {
        showLoader: true,
        loaderMessage: 'Fetching data...'
      }
    )
  }
}
```

### Manual Control
```tsx
import { useLoading } from '@/contexts/LoadingContext'

function MyComponent() {
  const { showLoader, hideLoader } = useLoading()

  const handleLongOperation = () => {
    showLoader('Processing payment...')

    // Your long operation
    setTimeout(() => {
      hideLoader()
    }, 3000)
  }
}
```

## Loading Messages

The system supports different loading messages for different operations:

- **Page transitions**: "Loading page..."
- **API calls**: "Loading..." (default)
- **Custom operations**: Any custom message you provide

## Styling

The loader uses the app's Material-UI theme:
- Primary color for logo
- Secondary color for progress indicators
- Consistent with the app's design system
- Responsive and accessible

## Performance

- Minimal bundle impact
- Smooth 60fps animations
- Optimized rendering with React.memo where appropriate
- Automatic cleanup to prevent memory leaks

## Browser Support

Works in all modern browsers that support:
- CSS backdrop-filter
- CSS animations
- React 18+
- Next.js 13+ App Router