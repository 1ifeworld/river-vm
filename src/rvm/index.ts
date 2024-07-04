import { Pool } from "pg";
import { ed25519ph } from "@noble/curves/ed25519";
import { base64url } from "@scure/base";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as dbSchema from "../schema.js";
import {
  isChannelCreateBody,
  isItemCreateBody,
  isItemSubmitBody,
  isGenericResponse,
  MessageTypes,
  CAPTION_MAX_LENGTH,
  Message,
  GenericResponseBody,
  ItemSubmitBody,
} from "./lib/types.js";
import { messageBodyToBase64Url, makeCid } from "./lib/utils.js"

// OFFICIAL RIVER CLASS

export class River {
  private db: NodePgDatabase<typeof dbSchema>;
  private authDb: NodePgDatabase<typeof dbSchema>;
  private pool: Pool;
  private authPool: Pool;

  private constructor(
    db: NodePgDatabase<typeof dbSchema>,
    authDb: NodePgDatabase<typeof dbSchema>,
    pool: Pool,
    authPool: Pool
  ) {
    this.db = db;
    this.authDb = authDb;
    this.pool = pool;
    this.authPool = authPool;
  }

  static async flow(): Promise<River> {
    const connectionString = process.env.DATABASE_URL!;
    const authConnectionString = process.env.AUTH_DATABASE_URL!;

    const pool = new Pool({ connectionString });
    const authPool = new Pool({ connectionString: authConnectionString });

    try {
      const client = await pool.connect();
      client.release();
      const authClient = await authPool.connect();
      authClient.release();
      console.log("Database connections successful");
    } catch (err) {
      console.error("Failed to connect to the databases", err);
      throw err;
    }

    const db = drizzle(pool, { schema: dbSchema });
    const authDb = drizzle(authPool, { schema: dbSchema });

    return new River(db, authDb, pool, authPool);
  }

  async disconnect() {
    await this.pool.end();
    await this.authPool.end();
  }

  // simple getters should not replace graphql over authdb
  // NOTE: i removed all of these because unncessary code at the moment

  public async verifyMessage(message: Message): Promise<boolean> {
    // 1. lookup user id
    const userExists = await this.authDb.query.usersTable.findFirst({
      where: (users, { eq }) =>
        eq(users.id, message.messageData.rid.toString()),
    });
    if (!userExists) return false;

    // 2. lookup signing key
    const keyExistsForUserAtTimestamp =
      await this.authDb.query.keyTable.findFirst({
        where: (keys, { and, eq }) =>
          and(
            eq(keys.userid, message.messageData.rid.toString()),
            eq(keys.publickey, message.signer)
          ),
      });

    if (!keyExistsForUserAtTimestamp) return false;

    // 3. verify hash of message = message.messageHash
    // investigate actual hashing function

    const computedHash = await makeCid(message.messageData);
    if (computedHash.toString() !== message.hash.toString()) return false;

    // 4. verify signature is valid over hash
    const valid = ed25519ph.verify(message.sig, message.hash, message.signer);
    if (!valid) return false;

    // 5. return true if all checks passed
    return true;
  }

  public async processMessage(message: Message): Promise<string | null> {
    if (!Object.values(MessageTypes).includes(message.messageData.type))
      return null;

    const handlers: {
      [K in MessageTypes]?: (message: Message) => Promise<string | null>;
    } = {
      [MessageTypes.CHANNEL_CREATE]: this._msg1_channelCreate,
      [MessageTypes.ITEM_CREATE]: this._msg6_itemCreate,
      [MessageTypes.ITEM_SUBMIT]: this._msg9_itemSubmit,
      [MessageTypes.GENERIC_RESPONSE]: this._msg17_genericResponse,
    };

    const handler = handlers[message.messageData.type];
    if (!handler) return null; // this check should be unncessary because we're checking for valid types at beginning of funciton?

    const result = await handler.call(this, message);
    if (!result) return null;

    this._storeValidMessage(result, message); // if handler returned cid we know its valid, store message in messageTable
    return result;
  }

  private async _storeValidMessage(
    messageId: string,
    message: Message
  ): Promise<void> {
    await this.db.insert(dbSchema.messageTable).values({
      id: messageId,
      rid: message.messageData.rid,
      timestamp: message.messageData.timestamp,
      type: message.messageData.type,
      body: messageBodyToBase64Url(message.messageData.body),
      signer: message.signer,
      hashType: message.hashType,
      hash: base64url.encode(message.hash),
      sigType: message.sigType,
      sig: base64url.encode(message.sig),
    });
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
    if (!isChannelCreateBody(message.messageData.body)) return null;
    // generate channel id
    const channelId = (await makeCid(message.messageData)).toString();
    // update RVM storage
    await this.db.insert(dbSchema.channelTable).values({
      id: channelId,
      content: JSON.stringify(message.messageData.body),
      timestamp: Number(message.messageData.timestamp),
      createdById: message.messageData.rid.toString(),
      uri: message.messageData.body.uri,
      // destructure cid to extract name and description?
      name: "",
      description: "",
    });
    return channelId;
  }

  /*
            NAME: ITEM_CREATE
            TYPE: 6
            BODY: {
                uri: string
            }
        */

  private async _msg6_itemCreate(message: Message): Promise<string | null> {
    // make sure message data body is correct type
    if (!isItemCreateBody(message.messageData.body)) return null;
    // generate itemId
    const itemId = (await makeCid(message.messageData)).toString();
    // update RVM storage
    await this.db.insert(dbSchema.ItemTable).values({
      id: itemId,
      createdById: message.messageData.rid.toString(),
      uri: message.messageData.body.uri,
    });
    return itemId;
  }

  /*
            NAME: ITEM_SUBMIT
            TYPE: 9
            BODY: {
                itemId: string
                channelId: string
                caption?: string
            }
        */

  private async _msg9_itemSubmit(message: Message): Promise<string | null> {
    if (!isItemSubmitBody(message.messageData.body)) return null;
    const { itemId, channelId, text } = message.messageData
      .body as ItemSubmitBody;

    const itemExists = await this.db.query.ItemTable.findFirst({
      where: (items, { eq }) => eq(items.id, itemId),
    });
    if (!itemExists) return null;

    const channelExists = await this.db.query.channelTable.findFirst({
      where: (channels, { eq }) => eq(channels.id, channelId),
    });
    if (!channelExists) return null;

    if (text && text.length > CAPTION_MAX_LENGTH) return null;

    const submissionId = (await makeCid(message.messageData)).toString();

    // TODO: make this an isOwnerOrMod lookup
    const isOwner = await this.db.query.channelTable.findFirst({
      where: (channels, { and, eq }) =>
        and(
          eq(channels.id, channelId),
          eq(channels.createdById, message.messageData.rid.toString())
        ),
    });

    await this.db.insert(dbSchema.submissionsTable).values({
      id: submissionId,
      content: JSON.stringify(message.messageData.body),
      userId: message.messageData.rid.toString(),
      status: isOwner ? 3 : 0, // channel owenrs/mods get their submissions automatically set to 2 (0 = pending, 1 = declined, 2 = accepted, 3 = owner/mod)
    });

    return submissionId;
  }

  /*
            NAME: GENERIC_RESPONSE
            TYPE: 17
            BODY: {
                messageId: string
                response: boolean
            }
        */

  private async _msg17_genericResponse(
    message: Message
  ): Promise<string | null> {
    if (!isGenericResponse(message.messageData.body)) return null;
    const { messageId, response } = message.messageData
      .body as GenericResponseBody;

    // NOTE: maybe should update messageId format to prepend with messageId
    // so that we dont need to keep a global message table and can just
    // look up specific message from its corresponding table
    // OR perhaps simpler is just some union Message table that joins
    // all of the individual message tables for the purpose of this specific query
    const messageExists = await this.db.query.messageTable.findFirst({
      where: (messages, { eq }) => eq(messages.id, messageId),
    });

    if (!messageExists) return null;

    const responseId = (await makeCid(message.messageData)).toString();

    // process things differently depending on type of message
    // the genericResponse was targeting
    switch (messageExists.type) {
      // generic response handler for
      case MessageTypes.ITEM_SUBMIT:
        // lookup submit message
        const submission = await this.db.query.submissionsTable.findFirst({
          where: (submissions, { eq }) => eq(submissions.id, messageId),
        });
        // return null if coudnt find submisison
        if (!submission) return null;
        // return null if submission status not equal to pending
        if (submission.status != 0) return null;
        // update status field
        await this.db
          .update(dbSchema.submissionsTable)
          .set({ status: response ? 2 : 1 }) // if response == true, set status to accepted (2), if false set to rejected (1)
          .where(eq(dbSchema.submissionsTable.id, messageId));
        break;
      case MessageTypes.CHANNEL_INVITE_MEMBER:
        // TODO: add logic
        break;
      case MessageTypes.USER_INVITE_FRIEND:
        // TODO: add logic
        break;
      // Default case if no matching case is found
      default:
        break;
    }

    // add this table
    await this.db.insert(dbSchema.responsesTable).values({
      id: responseId,
      targetMessageId: messageId,
      response: response,
    });

    return responseId;
  }
}
