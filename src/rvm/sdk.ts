import { ItemCreateBody, MessageTypes } from './types.js'
import { MessageData } from './types.js'
import { Message } from './types.js'

export function formatItemCreateMessage({
  rid,
  fileUri,
}: { rid: bigint; fileUri: string }): Message {
  const message = {
    signer: '0x',
    messageData: {
      rid: rid,
      timestamp: BigInt(Date.now()),
      type: MessageTypes.ITEM_CREATE,
      body: { uri: fileUri },
    },
    hashType: 1,
    hash: new Uint8Array(0),
    sigType: 1,
    sig: new Uint8Array(0),
  }
  return message
}
