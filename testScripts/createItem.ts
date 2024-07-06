import { Message, MessageTypes, ItemCreateBody } from '../src/rvm/lib/types.js'
import { base64 } from '@scure/base'

const exampleUri = 'bafybeiguzbqbgr7fslkza4w2ycsrkiuvmgqt5sh5q6hujykuorawq4nlbu'

async function createItem(itemUri: string): Promise<void> {
  const createItemMessage = formatCreateItemMessage(
    BigInt(1),
    BigInt(Date.now()),
    itemUri,
  )
  const serializedChannelMessage = serializeMessageForHttp(createItemMessage)

  try {
    const response = await fetch('http://localhost:3000/messageBatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [serializedChannelMessage],
      }),
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('URIs stored successfully:', result)
  } catch (error) {
    console.error('Error storing URIs:', error)
  }
}

await createItem(exampleUri)

export function serializeMessageForHttp(message: Message): string {
  const encodedMessage = {
    signer: base64.encode(message.signer),
    messageData: {
      rid: message.messageData.rid.toString(), // bigint to string conversion
      timestamp: message.messageData.timestamp.toString(), // bigint to string conversion
      type: message.messageData.type,
      body: message.messageData.body,
    },
    hashType: message.hashType,
    hash: base64.encode(message.hash),
    sigType: message.sigType,
    sig: base64.encode(message.sig),
  }

  return JSON.stringify(encodedMessage)
}

function createEmptyMessage(): Message {
  return {
    signer: new Uint8Array(),
    messageData: {
      rid: BigInt(0),
      timestamp: BigInt(0),
      type: 0,
      body: {},
    },
    hashType: 0,
    hash: new Uint8Array(),
    sigType: 0,
    sig: new Uint8Array(),
  }
}

function formatCreateItemMessage(
  rid: bigint,
  timestamp: bigint,
  uri: string,
): Message {
  const emptyMessage = createEmptyMessage()
  const overwrittenMessage = {
    ...emptyMessage,
    messageData: {
      rid: rid,
      timestamp: timestamp,
      type: MessageTypes.ITEM_CREATE,
      body: {
        uri: uri,
      } as ItemCreateBody,
    },
  }
  return overwrittenMessage
}
