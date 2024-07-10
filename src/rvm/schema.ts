import {
  integer,
  pgTable,
  text,
  timestamp,
  numeric,
  bigint,
  boolean,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/*
 * ****************
 * USERS
 * ****************
 */

// export const users = pgTable('users', {
//   id: text('userid').primaryKey(),
//   to: text('to'),
//   recovery: text('recovery'),
//   timestamp: timestamp('timestamp'),
//   log_addr: text('log_addr'),
//   block_num: numeric('block_num'),
// })

/*
 * ****************
 * KEYS
 * ****************
 */

// export const keyTable = pgTable(
//   'keys',
//   {
//     userid: numeric('userid')
//       .notNull()
//       .references(() => users.id),
//     custodyAddress: text('custodyAddress').notNull(),
//     deviceid: text('deviceid').notNull(),
//     publickey: text('publickey').notNull(), // toHex(uint8array pub key data)
//     encryptedprivatekey: text('encryptedprivatekey').notNull(), // toHex(encrypted uint8array priv key data)
//   },
//   (table) => ({
//     primaryKey: [table.userid, table.custodyAddress, table.deviceid],
//   }),
// )

/*
 * ****************
 * MESSAGES
 * ****************
 */

// private async _storeValidMessage(
//   messageId: string,
//   message: Message
// ): Promise<void> {
//   await this.db.insert(dbSchema.messageTable).values({
//     id: messageId,
//     rid: message.messageData.rid,
//     timestamp: message.messageData.timestamp,
//     type: message.messageData.type,
//     body: jsonStringifyBigIntSafe(message.messageData.body),
//     signer: toHex(message.signer),
//     hashType: message.hashType,
//     hash: toHex(message.hash),
//     sigType: message.sigType,
//     sig: toHex(message.sig),
//   });

export const messageTable = pgTable('messages', {
  id: text('id').primaryKey(),
  rid: bigint('rid', { mode: 'bigint' }),
  timestamp: bigint('timestamp', { mode: 'bigint' }),
  type: integer('type'),
  body: text('body'), // this will be JSON.stringified message body object
  signer: text('signer'),
  hashType: integer('hashType'),
  hash: text('hash'),
  sigType: integer('sigType'),
  sig: text('sig'),
})

/*
 * ****************
 * URI
 * ****************
 */

export const uriInfo = pgTable('uri_info', {
  id: text('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  imageUri: text('imageUri'),
  animationUri: text('animationUri'),
})

/*
 * ****************
 * CHANNELS
 * ****************
 */

export const channelTable = pgTable('channels', {
  id: text('id').primaryKey(),
  createdBy: bigint('createdBy', { mode: 'bigint' }),
  uri: text('uri'),
})

export const channelRelations = relations(channelTable, ({ one, many }) => ({
  uriInfo: one(uriInfo, {
    fields: [channelTable.uri],
    references: [uriInfo.id],
  }),
  submissions: many(submissionsTable),
}))

/*
 * ****************
 * ITEMS
 * ****************
 */

export const itemTable = pgTable('items', {
  id: text('id').primaryKey(),
  createdBy: bigint('createdBy', { mode: 'bigint' }),
  uri: text('uri'),
})

export const itemRelations = relations(itemTable, ({ one, many }) => ({
  uriInfo: one(uriInfo, {
    fields: [itemTable.uri],
    references: [uriInfo.id],
  }),
  submissionTable: many(submissionsTable),
}))

/*
 * ****************
 * SUBMISSIONS
 * ****************
 */

export const submissionsTable = pgTable('submissions', {
  id: text('id').primaryKey(),
  createdBy: bigint('createdBy', { mode: 'bigint' }),
  status: integer('status'), // 0 = pending | 1 = rejected | 2 = accepted | 3 = owner submission
  itemId: text('itemId').notNull(),
  channelId: text('channelId').notNull(),
  response: text('response'),
})

export const submissionsRelations = relations(submissionsTable, ({ one }) => ({
  itemId: one(itemTable, {
    fields: [submissionsTable.itemId],
    references: [itemTable.id],
  }),
  channelId: one(channelTable, {
    fields: [submissionsTable.channelId],
    references: [channelTable.id],
  }),
  responseInfo: one(responseInfo, {
    fields: [submissionsTable.response],
    references: [responseInfo.targetMessageId],
  }),
}))

/*
 * ****************
 * RESPONSES
 * ****************
 */

// TODO: unsolved not able to render all of responesInfo when querying submissionTable
// reserach more into foreign keys

export const responseInfo = pgTable('response_info', {
  id: text('id').primaryKey(),
  targetMessageId: text('targetMessageId').references(
    () => submissionsTable.id,
  ),
  response: boolean('response'),
})
