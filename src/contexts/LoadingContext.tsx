'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface LoadingContextType {
  isLoading: boolean
  loadingMessage: string
  showLoader: (message?: string) => void
  hideLoader: () => void
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    message?: string
  ) => Promise<T>
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')

  const showLoader = useCallback((message = 'Loading...') => {
    setLoadingMessage(message)
    setIsLoading(true)
  }, [])

  const hideLoader = useCallback(() => {
    setIsLoading(false)
    setLoadingMessage('Loading...')
  }, [])

  const withLoading = useCallback(
    async <T,>(asyncFn: () => Promise<T>, message = 'Loading...'): Promise<T> => {
      showLoader(message)
      try {
        const result = await asyncFn()
        return result
      } finally {
        hideLoader()
      }
    },
    [showLoader, hideLoader]
  )

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        showLoader,
        hideLoader,
        withLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}