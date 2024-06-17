import { buildSchema } from 'drizzle-graphql'
import { createYoga } from 'graphql-yoga'
import { db } from './db.js'

const { schema } = buildSchema(db)

const yoga = createYoga({ schema })

const server = Bun.serve({
  fetch: yoga,
})

console.info(
  `Server is running on ${new URL(
    yoga.graphqlEndpoint,
    `http://${server.hostname}:${server.port}`,
  )}`,
)
