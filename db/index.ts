import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prefetch as it is not supported for "Transaction" pool mode
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be defined in environment variables.')
}

const client = postgres(databaseUrl, { prepare: false })
export const db = drizzle({ client, schema })
