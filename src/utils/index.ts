import * as dagCbor from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Message, MessageDataBodyTypes } from '../rvm/types.js'
import { base64url } from '@scure/base'

export async function messageToCid(message: Message) {
  return await Block.encode({ value: message, codec: dagCbor, hasher: sha256 })
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