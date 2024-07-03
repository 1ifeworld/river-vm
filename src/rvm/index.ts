import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as dbSchema from '../schema.js'
import { ed25519ph } from '@noble/curves/ed25519'
import type {
  Message,
  GenericResponseBody,
  ItemSubmitBody,
  ItemCreateBody,
  MessageData,
} from './types.js'
import {
  isChannelCreateBody,
  isItemCreateBody,
  isItemSubmitBody,
  isGenericResponse,
  MessageTypes,
  CAPTION_MAX_LENGTH,
} from './types.js'
import * as dagCbor from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

export class River {
  private db: NodePgDatabase<typeof dbSchema>
  private authDb: NodePgDatabase<typeof dbSchema>
  private pool: Pool
  private authPool: Pool

  private constructor(
    db: NodePgDatabase<typeof dbSchema>,
    authDb: NodePgDatabase<typeof dbSchema>,
    pool: Pool,
    authPool: Pool,
  ) {
    this.db = db
    this.authDb = authDb
    this.pool = pool
    this.authPool = authPool
  }

  static async flow(): Promise<River> {
    const connectionString = process.env.DATABASE_URL!
    const authConnectionString = process.env.AUTH_DATABASE_URL!

    const pool = new Pool({ connectionString })
    const authPool = new Pool({ connectionString: authConnectionString })

    try {
      const client = await pool.connect()
      client.release()
      const authClient = await authPool.connect()
      authClient.release()
      console.log('Database connections successful')
    } catch (err) {
      console.error('Failed to connect to the databases', err)
      throw err
    }

    const db = drizzle(pool, { schema: dbSchema })
    const authDb = drizzle(authPool, { schema: dbSchema })

    return new River(db, authDb, pool, authPool)
  }

  async disconnect() {
    await this.pool.end()
    await this.authPool.end()
  }

  // simple getters should not replace graphql
  // auth db

  async getUser(userId: bigint) {
    return this.authDb.query.usersTable.findFirst({
      where: (users, { eq }) => eq(users.id, userId.toString()),
    })
  }

  async getPublicKey(userId: string) {
    const result = await this.authDb.query.keyTable.findFirst({
      where: (keys, { eq }) => eq(keys.userid, userId),
      columns: {
        publickey: true,
      },
    })
    return result?.publickey || null
  }

  // main db

  async getChannel(channelId: string) {
    return this.db.query.channelTable.findFirst({
      where: (channels, { eq }) => eq(channels.id, channelId),
    })
  }

  async getItem(itemId: string) {
    return this.db.query.ItemTable.findFirst({
      where: (items, { eq }) => eq(items.id, itemId),
    })
  }

  public async makeCid(messageData: MessageData) {
    return await Block.encode({
      value: messageData,
      codec: dagCbor,
      hasher: sha256,
    })
  }

  public async verifyMessage(message: Message): Promise<boolean> {
    // 1. lookup user id
    const userExists = await this.authDb.query.usersTable.findFirst({
      where: (users, { eq }) =>
        eq(users.id, message.messageData.rid.toString()),
    })
    if (!userExists) return false

    // 2. lookup signing key
    const keyExistsForUserAtTimestamp =
      await this.authDb.query.keyTable.findFirst({
        where: (keys, { and, eq }) =>
          and(
            eq(keys.userid, message.messageData.rid.toString()),
            eq(keys.publickey, message.signer),
          ),
      })

    if (!keyExistsForUserAtTimestamp) return false

    // 3. verify hash of message = message.messageHash
    // investigate actual hashing function

    const computedHash = await this.makeCid(message.messageData)
    if (computedHash.toString() !== message.hash.toString()) return false

    // 4. verify signature is valid over hash
    const valid = ed25519ph.verify(message.sig, message.hash, message.signer)
    if (!valid) return false

    // 5. return true if all checks passed
    return true
  }

  public formatItemCreateMessage({
    rid,
    fileUri,
  }: {
    rid: bigint
    fileUri: string
  }): Message {
    const message: Message = {
      signer: '0x',
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
    }
    return message
  }

  public async processMessage(message: Message): Promise<string | null> {
    if (!Object.values(MessageTypes).includes(message.messageData.type))
      return null

    const handlers: {
      [K in MessageTypes]?: (message: Message) => Promise<string | null>
    } = {
      [MessageTypes.CHANNEL_CREATE]: this._msg1_channelCreate,
      [MessageTypes.ITEM_CREATE]: this._msg5_itemCreate,
      [MessageTypes.ITEM_SUBMIT]: this._msg8_itemSubmit,
      [MessageTypes.GENERIC_RESPONSE]: this._msg17_genericResponse,
    }

    const handler = handlers[message.messageData.type]
    return handler ? handler.call(this, message) : null
  }

  /*
  		PRIVATE FUNCTIONS
		only accessible within vm context/runtime
	*/

  /*
		NAME: CHANNEL_CREATE
		TYPE: 1
		BODY: {
			uri: string
		}
	*/

  private async _msg1_channelCreate(message: Message): Promise<string | null> {
    // make sure message data body is correct type
    if (!isChannelCreateBody(message.messageData.body)) return null
    // generate channel id
    const channelId = (await this.makeCid(message.messageData)).toString()
    // update RVM storage
    await this.db.insert(dbSchema.channelTable).values({
      id: channelId,
      content: JSON.stringify(message.messageData.body),
      timestamp: Number(message.messageData.timestamp),
      createdById: message.messageData.rid.toString(),
      uri: message.messageData.body.uri,
      // destructure cid to extract name and description?
      name: '',
      description: '',
    })
    return channelId
  }

  /*
            NAME: ITEM_CREATE
            TYPE: 5
            BODY: {
                uri: string
            }
        */

  private async _msg5_itemCreate(message: Message): Promise<string | null> {
    // make sure message data body is correct type
    if (!isItemCreateBody(message.messageData.body)) return null
    // generate itemId
    const itemId = (await this.makeCid(message.messageData)).toString()
    // update RVM storage
    await this.db.insert(dbSchema.ItemTable).values({
      id: itemId,
      createdById: message.messageData.rid.toString(),
      uri: message.messageData.body.uri,
    })
    return itemId
  }

  /*
            NAME: ITEM_SUBMIT
            TYPE: 8
            BODY: {
                itemId: string
                channelId: string
                caption?: string
            }
        */

  private async _msg8_itemSubmit(message: Message): Promise<string | null> {
    if (!isItemSubmitBody(message.messageData.body)) return null
    const { itemId, channelId, caption } = message.messageData
      .body as ItemSubmitBody

    const itemExists = await this.db.query.ItemTable.findFirst({
      where: (items, { eq }) => eq(items.id, itemId),
    })
    if (!itemExists) return null

    const channelExists = await this.db.query.channelTable.findFirst({
      where: (channels, { eq }) => eq(channels.id, channelId),
    })
    if (!channelExists) return null

    if (caption && caption.length > CAPTION_MAX_LENGTH) return null

    const submissionId = (await this.makeCid(message.messageData)).toString()

    const isOwner = await this.db.query.channelTable.findFirst({
      where: (channels, { and, eq }) =>
        and(
          eq(channels.id, channelId),
          eq(channels.createdById, message.messageData.rid.toString()),
        ),
    })

    await this.db.insert(dbSchema.submissionsTable).values({
      id: submissionId,
      content: JSON.stringify(message.messageData.body),
      userId: message.messageData.rid.toString(),
    })

    return submissionId
  }

  /*
            NAME: ITEM_ACCREJ
            TYPE: 0
            BODY: {
                submissionId: string
                Response: boolean
                caption?: string
            }
        */

  private async _msg17_genericResponse(message: Message): Promise<string | null> {
    if (!isGenericResponse(message.messageData.body)) return null
    const { messageId, response } = message.messageData
      .body as GenericResponseBody

    // NOTE: maybe should update messageId format to prepend with messageId
    // so that we dont need to keep a global message table and can just
    // look up specific message from its corresponding table
    // OR perhaps simpler is just some union Message table that joins
    // all of the individual message tables for the purpose of this specific query
    const messageExists = await this.db.query.messageTable.findFirst({
      where: (messages, { eq }) => eq(messages.id, messageId),
    })

    if (!messageExists) return null

    const respId = (await this.makeCid(message.messageData)).toString()


    /*
      TODO: 
      depending on what message type this is responding to, 
      process approriate db updaets
      ex: if it was response to submit message, update the submission status
          if it was response to friend invite, update friend sttatus
    */

    // add this table
    await this.db.insert(dbSchema.responseTable).values({
      responseId: respId,
      messageId: messageId,
      response: response.toString(),
    })

    return respId
  }
}
