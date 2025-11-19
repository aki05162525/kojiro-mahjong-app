import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be defined in environment variables.')
}

export default defineConfig({
  out: './drizzle',
  schema: './db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
