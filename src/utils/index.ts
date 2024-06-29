import * as dagCbor from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Message } from '../rvm/types.js'

export async function messageToCid(message: Message) {
  return await Block.encode({ value: message, codec: dagCbor, hasher: sha256 })
}
