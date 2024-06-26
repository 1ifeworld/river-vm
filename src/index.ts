import { Hono } from 'hono'
import { RiverVmClient } from './clients/vm/index.js'
import { AwsClient } from './clients/aws/index.js'
import { KmsClient } from './clients/kms/index.js'

const app = new Hono()
const riverVm = new RiverVmClient()
const aws = new AwsClient()
const kms = new KmsClient(process.env.NEXT_EXPO_KMS_URL)

/*



*/

/*
  1. user uploads file to client 
  2. client sends request to river vm asking for a presigned url to upload the file
  3. client gets back preseigned url and starts uploading file
  4. client creates item message
  5. client creates add to channel message
  6. client submits messages to river-vm
*/

app.get('/preSignedUrl', async (c) => {
  const presignedUrl: string = await aws.getPresignedUrl()
  return c.json({ presignedUrl })
})

app.post('/createItem', async (c) => {
  const data = await c.req.json()
  const unSignedCreateItemMessage = riverVm.formatItemCreateMessage({ rid: data.rid, fileUri: data.fileUri})
  const signedMessage = kms.signMessage({ message: unSignedCreateItemMessage})
  const success = riverVm.submitMessage(signedMessage)
  return c.json({ message: success })
})

export default app

console.log('Server ready')
