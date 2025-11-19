import type { Metadata } from 'next'
import './globals.css'
import { PageHeader } from '@/components/common/page-header'
import { Providers } from './providers'

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
          <PageHeader />
          {children}
        </Providers>
      </body>
    </html>
  )
}
