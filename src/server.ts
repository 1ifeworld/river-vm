import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { buildSchema } from 'drizzle-graphql'
import { db } from './db.js'

const { schema } = buildSchema(db)

const server = new ApolloServer({ schema })

const { url } = await startStandaloneServer(server, {
  listen: {
    // @ts-ignore
    port: process.env.PORT, // Use Railway provided PORT
  },
})
console.log(`Server ready at ${url}`)
