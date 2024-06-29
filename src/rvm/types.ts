/*
 *
 *   MESSAGE TYPES
 *
 */

export enum MessageTypes {
  NONE = 0,
  CHANNEL_CREATE = 1,
  CHANNEL_EDIT_MEMBERS = 2,
  CHANNEL_EDIT_URI = 3,
  CHANNEL_TRANSFER_OWNER = 4,
  ITEM_CREATE = 5,
  ITEM_EDIT = 6,
  ITEM_DELETE = 7,
  ITEM_SUBMIT = 8,
  ITEM_ACC_REJ = 9,
  ITEM_REMOVE = 10,
  COMMENT_CREATE = 11,
  COMMENT_EDIT = 12,
  COMMENT_DELETE = 13,
  USER_SET_NAME = 14,
  USER_SET_URI = 15,
}

export enum HashTypes {
  NONE = 0,
  BLAKE_3 = 1,
}

export enum SignatureTypes {
  NONE = 0,
  ED25519 = 1,
  EIP712 = 2,
}

export type Message = {
  signer: string
  messageData: MessageData
  hashType: HashTypes
  hash: Uint8Array
  sigType: SignatureTypes
  sig: Uint8Array
}

export function isMessage(data: Message): data is Message {
  return (
    typeof data.signer === 'string' &&
    typeof data.messageData === 'object' &&
    typeof data.hashType === 'string' &&
    (data.hashType === 'sha256' || data.hashType === 'sha512') &&
    data.hash instanceof Uint8Array &&
    typeof data.sigType === 'string' &&
    (data.sigType === 'ed25519' || data.sigType === 'secp256k1') &&
    data.sig instanceof Uint8Array
  )
}

export type MessageData = {
  rid: bigint
  timestamp: bigint
  type: MessageTypes
  body: MessageDataBodyTypes
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
export type ChannelEditMember = {
  channelId: string
  member: {
    rid: bigint
    role: 0 | 1 | 2 // 0 = none, 1 = member, 2 = admin
  }
}

/*
 * 3
 */
export type ChannelEditUri = {
  channelId: string
  uri: string
}

/*
 * 4
 */
export type ChannelTransferOwner = {
  channelId: string
  transferToRid: bigint
}

/*
 * 5
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
 * 6
 */
export type ItemEditBody = {
  itemId: string
  uri: string
}

/*
 * 7
 */
export type ItemDeleteBody = {
  itemId: string
}

/*
 * 8
 */
export type ItemSubmitBody = {
  itemId: string
  channelId: string
  caption?: string // MAX 300 CHAR LIMIT
}

export function isItemSubmitBody(obj: unknown): obj is ItemSubmitBody {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const messageBody = obj as Partial<ItemSubmitBody>

  return (
    typeof messageBody.itemId === 'string' &&
    typeof messageBody.channelId === 'string' &&
    (messageBody.caption === undefined ||
      (typeof messageBody.caption === 'string' &&
        messageBody.caption.length <= 300))
  )
}

/*
 * 9
 */

export function isItemAccRejBody(obj: unknown): obj is ItemAccRejBody {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const messageBody = obj as Partial<ItemAccRejBody>

  return (
    typeof messageBody.submissionId === 'string' &&
    typeof messageBody.response === 'boolean' &&
    (messageBody.caption === undefined ||
      (typeof messageBody.caption === 'string' &&
        messageBody.caption.length <= 300))
  )
}
export type ItemAccRejBody = {
  submissionId: string
  response: boolean // FALSE = rejected, TRUE = accepted
  caption?: string // MAX_CHAR_LIMIT = 300
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
export type UserSetNameBody = {
  fromId: bigint
  toId: bigint
  username: string // MAX_CHAR_LIMIT = 15 + regex
}

/*
 * 15
 */
export type UserSetUriBody = {
  rid: bigint
  uri: string
}

/*
 * Message Data Body Union type
 */
export type MessageDataBodyTypes =
  | ChannelCreateBody
  | ChannelEditMember
  | ChannelEditUri
  | ChannelTransferOwner
  | ItemCreateBody
  | ItemEditBody
  | ItemDeleteBody
  | ItemSubmitBody
  | ItemAccRejBody
  | ItemRemoveBody
  | CommentCreateBody
  | CommentEditBody
  | CommentDeleteBody
  | UserSetNameBody
  | UserSetUriBody

export const CAPTION_MAX_LENGTH = 300
