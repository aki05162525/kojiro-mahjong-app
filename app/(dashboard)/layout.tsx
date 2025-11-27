import type { ReactNode } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Providers } from '../providers'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Providers>
      <PageHeader />
      {children}
    </Providers>
  )
}
