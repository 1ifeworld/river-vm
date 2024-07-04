import * as dagCbor from "@ipld/dag-cbor";
import * as Block from "multiformats/block";
import { sha256 } from "multiformats/hashes/sha2";
import {
  Message,
  MessageData,
  MessageDataBodyTypes,
  MessageTypes,
  ItemCreateBody,
} from "./types.js";
import { Hex, toHex, hexToString } from "viem";
import { blake3 } from "@noble/hashes/blake3";

export function messageBodyToHex(messageBody: MessageDataBodyTypes): Hex {
  const jsonString = JSON.stringify(messageBody, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  const jsonHex = toHex(jsonString);
  return jsonHex;
}

export function hexToMessageBody(hexBody: Hex): MessageDataBodyTypes {
  const jsonString = hexToString(hexBody);

  return JSON.parse(jsonString, (key, value) => {
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

export function messageDataToHex(messageData: MessageData): Hex {
  const jsonString = JSON.stringify(messageData, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  const jsonHex = toHex(jsonString);
  return jsonHex;
}

export function messageDataToHash(messageData: MessageData): Hex {
  const messageDataHex = messageDataToHex(messageData);
  const messageDataHash = blake3(messageDataHex)
  const messageDataHashToHex = toHex(messageDataHash)
  return messageDataHashToHex;
}

export async function messageDataToCid(messageData: MessageData) {
  return await Block.encode({
    value: messageData,
    codec: dagCbor,
    hasher: sha256,
  });
}

export function formatItemCreateMessage({
  rid,
  fileUri,
}: {
  rid: bigint;
  fileUri: string;
}): Message {
  const rawMessageBody = { uri: fileUri } as ItemCreateBody;
  const messageBodyHex = messageBodyToHex(rawMessageBody);
  const messageData = {
    rid: rid,
    timestamp: BigInt(Date.now()),
    type: MessageTypes.ITEM_CREATE,
    body: messageBodyHex,
  };

  const message: Message = {
    signer: "0x",
    messageData: messageData,
    hashType: 1,
    hash: messageDataToHash(messageData),
    sigType: 1,
    sig: "0x",
  };
  return message;
}
