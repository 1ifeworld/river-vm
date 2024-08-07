import {
  Message,
  MessageTypes,
  GenericResponseBody,
} from '../src/rvm/lib/types.js'
import { base64 } from '@scure/base'

const submissionId =
  'bafyreiavsqke6rzj63xdm3uxdsbphwyval67ifr77rrqke7if5lcxksjki'
const accept = true
const reject = false

async function createResponse(
  messageId: string,
  response: boolean,
): Promise<void> {
  const genericResponseMessage = formatGenericResponseMessage(
    BigInt(1),
    BigInt(Date.now()),
    messageId,
    response,
  )
  const serializedChannelMessage = serializeMessageForHttp(
    genericResponseMessage,
  )

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
    console.log('', result)
  } catch (error) {
    console.error('Error storing URIs:', error)
  }
}

await createResponse(submissionId, accept)

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

export function formatGenericResponseMessage(
  rid: bigint,
  timestamp: bigint,
  messageId: string,
  response: boolean,
): Message {
  const emptyMessage = createEmptyMessage()
  const overwrittenMessage = {
    ...emptyMessage,
    messageData: {
      rid: rid,
      timestamp: timestamp,
      type: MessageTypes.GENERIC_RESPONSE,
      body: {
        messageId: messageId,
        response: response,
      } as GenericResponseBody,
    },
  }
  return overwrittenMessage
}
