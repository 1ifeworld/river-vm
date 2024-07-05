import { buildSchema } from 'drizzle-graphql'
import { createYoga } from 'graphql-yoga'
import { river } from './index.js'



const { schema } = buildSchema(river.db)

const yoga = createYoga({
  schema,
  cors: {
    origin: '*', // Allow all origins
    credentials: true, // If your client needs to send credentials
  }
})

const server = Bun.serve({
  port: 9000,
  fetch: yoga,
})

console.info(
  `Server is running on ${new URL(
    yoga.graphqlEndpoint,
    `http://${server.hostname}:${server.port}`,
  )}`,
)