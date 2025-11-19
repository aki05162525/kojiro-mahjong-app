import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kojiro Mahjong App',
  description: 'Mahjong league management application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
