import { Hono } from 'hono'
import { createUser } from './queries.js'
import type { InsertUser } from './schema.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Skeleton!')
})

app.post('/create-user', async (c) => {
  const data = await c.req.json<InsertUser>()
  await createUser(data)
  return c.json({ message: 'User created' })
})

export default app

console.log('Server ready')
