import * as dagCbor from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { Message, MessageData, MessageDataBodyTypes, MessageTypes, ItemCreateBody } from './types.js'
import { base64url } from '@scure/base'

export async function messageToCid(message: Message) {
  return await Block.encode({ value: message, codec: dagCbor, hasher: sha256 })
}

export async function makeCid(messageData: MessageData) {
  return await Block.encode({
    value: messageData,
    codec: dagCbor,
    hasher: sha256,
  });
}

export function messageBodyToBase64Url(messageBody: MessageDataBodyTypes): string {
  const jsonString = JSON.stringify(messageBody, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  const encoder = new TextEncoder()
  const uint8Array = encoder.encode(jsonString)
  return base64url.encode(uint8Array)
}

export function base64UrlToMessageBody(encodedMessageBody: string): MessageDataBodyTypes {
  const uint8Array = base64url.decode(encodedMessageBody);
  const decoder = new TextDecoder();
  const json = decoder.decode(uint8Array);

  return JSON.parse(json, (key, value) => {
    // Check if the value is a string and can be parsed as a number
    if (typeof value === "string" && !isNaN(Number(value))) {
      // Convert back to BigInt if it was originally a bigint
      if (BigInt(value).toString() === value) {
        return BigInt(value);
      }
    }
    return value;
  });
}

export function formatItemCreateMessage({
  rid,
  fileUri,
}: {
  rid: bigint;
  fileUri: string;
}): Message {
  const message: Message = {
    signer: "0x",
    messageData: {
      rid: rid,
      timestamp: BigInt(Date.now()),
      type: MessageTypes.ITEM_CREATE,
      body: { uri: fileUri } as ItemCreateBody,
    },
    hashType: 1,
    hash: new Uint8Array(0),
    sigType: 1,
    sig: new Uint8Array(0),
  };
  return message;
}