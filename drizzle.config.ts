import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { getDatabaseUrl } from './src/config/env'

export default defineConfig({
  out: './drizzle',
  schema: './db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
})
