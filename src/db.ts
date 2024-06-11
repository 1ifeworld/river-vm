import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as dbSchema from './schema.js'

const client = new Client({
  connectionString: process.env.DATABASE_URL!,
})

await client.connect()

export const db = drizzle(client, { schema: dbSchema })
