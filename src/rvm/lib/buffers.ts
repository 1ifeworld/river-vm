import {
  MessageData,
  Message,
  MessageTypes,
  MessageDataBodyTypes,
  HashTypes,
  SignatureTypes,
} from "./types.js";
import { blake3 } from "@noble/hashes/blake3";
import { base64 } from "@scure/base";
import * as dagCbor from "@ipld/dag-cbor";
import * as Block from "multiformats/block";
import { sha256 } from "multiformats/hashes/sha2";

export async function messageDataToCid(messageData: MessageData) {
  const block = await Block.encode({
    value: messageData,
    codec: dagCbor,
    hasher: sha256,
  });
  return block.cid;
}

export function messageDataToHash(messagData: MessageData): Uint8Array {
  const bodyToJsonString = JSON.stringify(messagData, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  const encoder = new TextEncoder();
  const encodedJsonString = encoder.encode(bodyToJsonString);
  const hash = blake3(encodedJsonString);
  return hash;
}

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
  };

  return JSON.stringify(encodedMessage);
}

export function deserializeMessageForHttp(jsonString: string): Message {
  const encodedMessage: {
    signer: string;
    messageData: {
      rid: string;
      timestamp: string;
      type: MessageTypes;
      body: MessageDataBodyTypes;
    };
    hashType: HashTypes;
    hash: string;
    sigType: SignatureTypes;
    sig: string;
  } = JSON.parse(jsonString);

  return {
    signer: base64.decode(encodedMessage.signer),
    messageData: {
      rid: BigInt(encodedMessage.messageData.rid),
      timestamp: BigInt(encodedMessage.messageData.timestamp),
      type: encodedMessage.messageData.type,
      body: encodedMessage.messageData.body,
    },
    hashType: encodedMessage.hashType,
    hash: base64.decode(encodedMessage.hash),
    sigType: encodedMessage.sigType,
    sig: base64.decode(encodedMessage.sig),
  };
}