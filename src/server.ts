import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { buildSchema } from 'drizzle-graphql'
import { db } from './db.js'

const { schema } = buildSchema(db)

const server = new ApolloServer({ schema })
const { url } = await startStandaloneServer(server, {
  listen: {
    port: 4000,
  },
})

console.log(`Server ready at ${url}`)
