import { Hono } from 'hono'
import { RiverVmClient } from './rvm/index.js'
import { db } from './db.js'

const app = new Hono()
const riverVm = new RiverVmClient(db)

app.post('/message', async (c) => {
  // recieve data
  const data = await c.req.json()
  // verify cryptography of message
  const verified = riverVm.verifyMessage(data.message)
  if (!verified) return c.json({ message: 'message not verified' })
  // process message
  const vmResponse = riverVm.processMessage(data.message)
  // return results of message
  return c.json({ message: vmResponse })
})

export default app

console.log('Server ready')
