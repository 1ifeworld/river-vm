import { buildSchema } from 'drizzle-graphql'
import { createYoga } from 'graphql-yoga'
import { river } from './index.js'

const { schema } = buildSchema(river.db)

const yoga = createYoga({
  schema,
  cors: {
    origin: '*', // Allow all origins
    credentials: true, // If your client needs to send credentials
  },
})

const port = process.env.PORT || 4001

const server = Bun.serve({
  port,
  fetch: yoga,
})

console.info(`GQL server is running on ${server.port}`)
