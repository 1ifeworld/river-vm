/*
 *
 *   MESSAGE TYPES
 *
 */

import { Hex, isHex } from "viem"

export enum HashTypes {
  NONE = 0,
  BLAKE_3 = 1,
}

export enum SignatureTypes {
  NONE = 0,
  ED25519 = 1,
  EIP712 = 2,
}

export enum MessageTypes {
  NONE = 0,
  CHANNEL_CREATE = 1,
  CHANNEL_EDIT = 2,
  CHANNEL_DELETE = 3,
  CHANNEL_INVITE_MEMBER = 4,
  CHANNEL_TRANSFER_OWNER = 5,
  ITEM_CREATE = 6,
  ITEM_EDIT = 7,
  ITEM_DELETE = 8,
  ITEM_SUBMIT = 9,
  ITEM_REMOVE = 10,
  COMMENT_CREATE = 11,
  COMMENT_EDIT = 12,
  COMMENT_DELETE = 13,
  USER_SET_NAME = 14,
  USER_SET_DATA = 15, // initially we just support setting a bio capped to specific char count. could eventually support URI schema
  USER_INVITE_FRIEND = 16,
  GENERIC_RESPONSE = 17,
}

export type Message = {
  signer: Hex
  messageData: MessageData
  hashType: HashTypes
  hash: Hex
  sigType: SignatureTypes
  sig: Hex
}

export function isMessage(data: Message): data is Message {
  return (
    isHex(data.signer) &&
    typeof data.messageData === 'object' &&
    typeof data.hashType === 'string' &&
    (data.hashType === 'sha256' || data.hashType === 'sha512') &&
    isHex(data.hash) &&
    typeof data.sigType === 'string' &&
    (data.sigType === 'ed25519' || data.sigType === 'secp256k1') &&
    isHex(data.sig)
  );
}

export type MessageData = {
  rid: bigint
  timestamp: bigint
  type: MessageTypes
  body: Hex
}

/*
 *
 *   MESSAGE BODY TYPES
 *
 */

/*
 * 1
 */
export type ChannelCreateBody = {
  uri: string
}

// type guard function
export function isChannelCreateBody(obj: unknown): obj is ChannelCreateBody {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    typeof (obj as { uri: unknown }).uri === 'string'
  )
}

/*
 * 2
 */
export type ChannelEditBody = {
  channelId: string
  uri: string
}

/*
 * 3
 */
export type ChannelDeleteBody = {
  channelId: string
}

/*
 * 4
 */
export type ChannelInviteMemberBody = {
  channelId: string
  memberRid: bigint
}


/*
 * 5
 */
export type ChannelTransferOwnerBody = {
  channelId: string
  transferToRid: bigint
}

/*
 * 6
 */
export type ItemCreateBody = {
  uri: string
}

// type guard function
export function isItemCreateBody(obj: unknown): obj is ItemCreateBody {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    typeof (obj as { uri: unknown }).uri === 'string'
  )
}

/*
 * 7
 */
export type ItemEditBody = {
  itemId: string
  uri: string
}

/*
 * 8
 */
export type ItemDeleteBody = {
  itemId: string
}

/*
 * 9
 */
export type ItemSubmitBody = {
  itemId: string
  channelId: string
  text?: string // MAX 300 CHAR LIMIT
}

export function isItemSubmitBody(obj: unknown): obj is ItemSubmitBody {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const messageBody = obj as Partial<ItemSubmitBody>

  return (
    typeof messageBody.itemId === 'string' &&
    typeof messageBody.channelId === 'string' &&
    (messageBody.text === undefined ||
      (typeof messageBody.text === 'string' &&
        messageBody.text.length <= 300))
  )
}

/*
 * 10
 */
export type ItemRemoveBody = {
  submissionId: string
}

/*
 * 11
 */
export type CommentCreateBody = {
  targetId: string // Must be SUBMISSION_ID or COMMENT_ID
  text: string // MAX_CHAR_LIMIT = 300
}

/*
 * 12
 */
export type CommentEditBody = {
  commentId: string
  text: string // MAX_CHAR_LIMIT = 300
}

/*
 * 13
 */
export type CommentDeleteBody = {
  commentId: string
}

/*
 * 14
 */
// TODO: set up the protocol logic for handling this correectly
// based off how we are currently doing it in username DB
export type UserSetNameBody = {
  fromRid?: bigint
  toRid?: bigint
  username?: string // MAX_CHAR_LIMIT = 15 + regex
}

/*
 * 15
 */
export type UserSetDataBody = {
  rid: bigint
  data: string // initially just support pure text "bios" of a max length
}

/*
 * 16
 */
export type UserInviteFriendBody = {
  rid: bigint
}

/*
 * 17
 */
export type GenericResponseBody = {
  messageId: string
  response: boolean
}

export function isGenericResponse(obj: unknown): obj is GenericResponseBody {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'messageId' in obj &&
    typeof (obj as { messageId: unknown }).messageId === 'string' &&
    'response' in obj &&
    ((obj as { response: unknown }).response === 0 || (obj as { response: unknown }).response === 1)
  )
}

/*
 * Message Data Body Union type
 */
export type MessageDataBodyTypes =
  | ChannelCreateBody
  | ChannelEditBody
  | ChannelInviteMemberBody
  | ChannelTransferOwnerBody
  | ItemCreateBody
  | ItemEditBody
  | ItemDeleteBody
  | ItemSubmitBody
  | ItemRemoveBody
  | CommentCreateBody
  | CommentEditBody
  | CommentDeleteBody
  | UserSetNameBody
  | UserSetDataBody
  | UserSetDataBody
  | GenericResponseBody

export const CAPTION_MAX_LENGTH = 300
export const BIO_MAX_LENGTH = 50