'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLoading } from '@/contexts/LoadingContext'

export function useRouterLoading() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { showLoader, hideLoader } = useLoading()
  const isInitialLoad = useRef(true)

  useEffect(() => {
    // Skip loading on initial page load
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    // Show loader when route changes
    showLoader('Loading page...')

    // Hide loader after a short delay to ensure page has loaded
    const timeoutId = setTimeout(() => {
      hideLoader()
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [pathname, searchParams, showLoader, hideLoader])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hideLoader()
    }
  }, [hideLoader])
}