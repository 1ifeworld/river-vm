import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as dbSchema from '../schema.js'
import { ed25519ph } from '@noble/curves/ed25519'
import type {
    Message,
    ItemAccRejBody,
    ItemSubmitBody,
    ItemCreateBody,
    MessageData
} from './types.js'
import {
    isChannelCreateBody,
    isItemCreateBody,
    isItemSubmitBody,
    isItemAccRejBody,
    MessageTypes,
    CAPTION_MAX_LENGTH
} from './types.js'

import * as dagCbor from '@ipld/dag-cbor'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'

export async function messageToCid(message: Message) {
  return await Block.encode({ value: message, codec: dagCbor, hasher: sha256 })
}

export class River {
  private db: NodePgDatabase<typeof dbSchema>
  private pool: Pool

  private constructor(db: NodePgDatabase<typeof dbSchema>, pool: Pool) {
    this.db = db
    this.pool = pool
  }
// being a little too cute 
  static async flow(): Promise<River> {
    const connectionString = process.env.DATABASE_URL!

    const pool = new Pool({ connectionString })

    try {
      const client = await pool.connect()
      client.release()
      console.log('Database connection successful')
    } catch (err) {
      console.error('Failed to connect to the database', err)
      throw err
    }

    const db = drizzle(pool, { schema: dbSchema })
    return new River(db, pool)
  }

  async disconnect() {
    await this.pool.end()
  }

  // simple getters should not replace graphql 

  async getUser(userId: bigint) {
    return this.db.query.usersTable.findFirst({
      where: (users, { eq }) => eq(users.id, userId.toString()),
    })
  }
  
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
    return await Block.encode({ value: messageData, codec: dagCbor, hasher: sha256 })
  }


  public async verifyMessage(message: Message): Promise<boolean> {
    // 1. lookup user id
    const userExists = await this.db.query.usersTable.findFirst({
      where: (users, { eq }) => eq(users.id, message.messageData.rid.toString()),
    })
    if (!userExists) return false

    // 2. lookup signing key
    const keyExistsForUserAtTimestamp = await this.db.query.keyTable.findFirst({
      where: (keys, { and, eq }) => and(
        eq(keys.userid, message.messageData.rid.toString()),
        eq(keys.encryptedprivatekey, message.signer)
      )
    })
    if (!keyExistsForUserAtTimestamp) return false

    // 3. verify hash of message = message.messageHash
    // investigate actual hashing function 

    const computedHash = (await this.makeCid(message.messageData))
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
    // return null if invalid or message type
    if (!Object.values(MessageTypes).includes(message.messageData.type))
      return null
    
    let response = null
    switch (message.messageData.type) {
      case MessageTypes.CHANNEL_CREATE:
        response = await this._msg1_channelCreate(message)
        break
      case MessageTypes.ITEM_CREATE:
        response = await this._msg5_itemCreate(message)
        break
      case MessageTypes.ITEM_SUBMIT:
        response = await this._msg8_itemSubmit(message)
        break
      case MessageTypes.ITEM_ACC_REJ:
        response = await this._msg9_itemAccRej(message)
        break
      default:
        console.warn(`Unexpected message type: ${message.messageData.type}`)
    }
    return response
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
              const { itemId, channelId, caption } = message.messageData.body as ItemSubmitBody
              
              const itemExists = await this.db.query.ItemTable.findFirst({
                  where: (items, { eq }) => eq(items.id, itemId)
              })
              if (!itemExists) return null
              
              const channelExists = await this.db.query.channelTable.findFirst({
                  where: (channels, { eq }) => eq(channels.id, channelId)
              })
              if (!channelExists) return null
              
              if (caption && caption.length > CAPTION_MAX_LENGTH) return null
              
              const submissionId = (await this.makeCid(message.messageData)).toString()
              
              const isOwner = await this.db.query.channelTable.findFirst({
                  where: (channels, { and, eq }) => and(
                      eq(channels.id, channelId),
                      eq(channels.createdById, message.messageData.rid.toString())
                  )
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
    
            private async _msg9_itemAccRej(message: Message): Promise<string | null> {
              if (!isItemAccRejBody(message.messageData.body)) return null
              const { submissionId, response, caption } = message.messageData.body as ItemAccRejBody
              
              const submissionExists = await this.db.query.submissionsTable.findFirst({
                  where: (submissions, { eq }) => eq(submissions.id, submissionId)
              })
              if (!submissionExists) return null
              
              if (caption && caption.length > CAPTION_MAX_LENGTH) return null
              
              const accRejId = (await this.makeCid(message.messageData)).toString()
              
              const isOwnerOrModerator = await this.db.query.channelTable.findFirst({
                  where: (channels, { eq }) => eq(channels.createdById, message.messageData.rid.toString())
                  // You might need to adjust this query based on how you determine ownership/moderation
              })
              if (!isOwnerOrModerator) return null
              
              await this.db.insert(dbSchema.acceptedRejectedTable).values({
                  messageId: accRejId,
                  submissionId: submissionId,
                  response: response.toString(),
                  caption: caption,
              })
              
              return accRejId
          } 
        
        }
