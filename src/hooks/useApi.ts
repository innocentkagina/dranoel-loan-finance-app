'use client'

import { useLoading } from '@/contexts/LoadingContext'
import { useCallback } from 'react'

interface ApiOptions {
  showLoader?: boolean
  loaderMessage?: string
}

export function useApi() {
  const { withLoading } = useLoading()

  const apiCall = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: ApiOptions = {}
    ): Promise<T> => {
      const { showLoader = true, loaderMessage = 'Loading...' } = options

      if (showLoader) {
        return withLoading(asyncFn, loaderMessage)
      } else {
        return asyncFn()
      }
    },
    [withLoading]
  )

  return { apiCall }
}