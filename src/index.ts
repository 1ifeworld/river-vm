import { Hono } from 'hono'
import type { Message } from '../src/rvm/types.js' 
import { River } from './rvm/index.js'
import { isMessage } from '../src/rvm/types.js'

const app = new Hono()

const river = await River.flow()

app.post('/message', async (c) => {
  try {
    // Receive data
    const data = await c.req.json()

    if (!isMessage(data.message)) {
      return c.json({ error: 'Invalid message format' }, 400)
    }

    const message: Message = data.message

    const verified = await river.verifyMessage(message)
    
    if (!verified) {
      return c.json({ error: 'Message not verified' }, 401)
    }
    const processMessageResponse = await river.processMessage(message)

    return c.json({ result: processMessageResponse })
  } catch (error) {
    console.error('Error processing message:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully')
  await river.disconnect()
  process.exit(0)
})

export default app

console.log('Server ready')