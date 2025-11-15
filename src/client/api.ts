import { hc } from 'hono/client'
import type { AppType } from '../server/routes'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

export const apiClient = hc<AppType>(getBaseUrl())
