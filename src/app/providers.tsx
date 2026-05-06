'use client'

import { SessionProvider } from 'next-auth/react'
import SpotifyProvider from '@/components/SpotifyProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SpotifyProvider>
        {children}
      </SpotifyProvider>
    </SessionProvider>
  )
}
