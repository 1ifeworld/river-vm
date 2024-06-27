import {
  Message,
  ItemAccRejBody,
  ItemSubmitBody,
  isChannelCreateBody,
  isItemCreateBody,
  MessageTypes,
} from "./types.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { ed25519ph } from "@noble/curves/ed25519";

export class RiverVmClient {
  /*
  		VM SETUP
	*/

  private vmStorage: NodePgDatabase;
  constructor(db: NodePgDatabase) {
    this.vmStorage = db;
  }

  /*
  		PUBLIC FUNCTIONS
	*/

  public async verifyMessage(message: Message): Promise<boolean> {
    // 1. lookup user id
    const userExists = await this.vmStorage.query.usersTable({
      userId: message.messageData.rid,
    });
    if (!userExists) return false;
    // 2. lookup signing key
    const keyExistsForUserAtTimestamp = this.vmStorage.query.keyTable({
      userId: message.messageData.rid,
      signer: message.signer,
      timestamp: message.messageData.timestamp,
    });
    if (!keyExistsForUserAtTimestamp) return false;
    // 3. verify hash of message = message.messageHash
    const computedHash = _ourHashingFunction(message.messageData);
    if (computedHash != message.hash) return false;
    // 4. verify signature is valid over hash
    const valid = ed25519ph.verify(message.sig, message.hash, message.signer);
    if (!valid) return false;
    // 5. return true if all checks passed
    return true;
  }

  public async processMessage(message: Message): Promise<string | null> {
    // return null if invalid or NONE message type
    if (!Object.values(MessageTypes).includes(message.messageData.type))
      return null;
    if (message.messageData.type == MessageTypes.NONE) return null;
    // route message to executor function
    let vmResponse = null;
    switch (message.messageData.type) {
      case MessageTypes.CHANNEL_CREATE: {
        vmResponse = this._msg1_channelCreate(message);
      }
      case MessageTypes.ITEM_CREATE: {
        vmResponse = this._msg5_itemCreate(message);
      }
      case MessageTypes.ITEM_SUBMIT: {
        vmResponse = this._msg8_itemSubmit(message);
      }
      case MessageTypes.ITEM_ACC_REJ: {
        vmResponse = this._msg9_itemAccRej(message);
      }
    }
    return vmResponse;
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
    const channelId = _ourHashingFunction(message.messageData);
    // update RVM storage
    await this.vmStorage.update.channelTable(channelId, message.messageData);
    // return channelId in request
    return channelId;
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
    if (!isItemCreateBody(message.messageData.body)) return null;
    // generate itemId
    const itemId = _ourHashingFunction(message.messageData);
    // update RVM storage
    await this.vmStorage.update.itemTable(itemId, message.messageData);
    // return itemId in request
    return itemId;
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
    // make sure message data body is correct type
    if (!isItemSubmitBody(message.messageData.body)) return null;
    // destructure body object for vis
    const { itemId, channelId, caption } = message.messageData
      .body as ItemSubmitBody;
    // check if item exists
    const itemExists = this.vmStorage.query.itemTable(itemId);
    if (!itemExists) return null;
    // check if channel exists
    const channelExists = this.vmStorage.query.channelTable(channelId);
    if (!channelExists) return null;
    // check caption for max length
    if (caption && caption.length > CAPTION_MAX_LENGTH) return null;
    // generate submissionId
    const submissionId = _ourHashingFunction(message.messageData);
    // check if user is owner of channel
    const isOwner = this.vmStorage.query.channelTable(
      channelId,
      message.messageData.rid
    );
    // update RVM storage
    if (isOwner) {
      await this.vmStorage.update.submissionTable(
        submissionId,
        message.messageData,
        OWNER_FLAG
      );
    } else {
      await this.vmStorage.update.submissionTable(
        submissionId,
        message.messageData,
        null
      );
    }
    // return submissionId in request
    return submissionId;
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
    // make sure message data body is correct type
    if (!isItemAccRejBody(message.messageData.body)) return null;
    // destructure body object for vis
    const { submissionId, response, caption } = message.messageData
      .body as ItemAccRejBody;
    // check if submission exists
    const submissionExists = this.vmStorage.query.submissionTable(submissionId);
    if (!submissionExists) return null;
    // check caption for max length
    if (caption && caption.length > CAPTION_MAX_LENGTH) return null;
    // generate accRejId
    const accRejId = _ourHashingFunction(message.messageData);
    // check if user is owner/moderator of channel
    const isOwnerOrModerator = this.vmStorage.query.channelTable(
      submissionExists.channelId,
      message.messageData.rid
    );
    if (!isOwnerOrModerator) return null;
    // update RVM storage
    this.vmStorage.update.accRejTable(accRejId, message.messageData);
    // return accRejId in request
    return accRejId;
  }
}
