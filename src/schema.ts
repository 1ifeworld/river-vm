import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
  id: numeric('userid').primaryKey(),
  to: text('to'),
  recovery: text('recovery'),
  timestamp: timestamp('timestamp'),
  log_addr: text('log_addr'),
  block_num: numeric('block_num'),
})

export type InsertUser = typeof usersTable.$inferInsert
export type SelectUser = typeof usersTable.$inferSelect

export const sessionsTable = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: numeric('userid')
    .notNull()
    .references(() => usersTable.id),
  deviceId: text('deviceid').notNull(),
  created: timestamp('created'),
  expiresAt: timestamp('expiresat').notNull(),
})

export type InsertSession = typeof sessionsTable.$inferInsert
export type SelectSession = typeof sessionsTable.$inferSelect

export const keyTable = pgTable(
  'keys',
  {
    userid: numeric('userid')
      .notNull()
      .references(() => usersTable.id),
    custodyAddress: text('custodyAddress').notNull(),
    deviceid: text('deviceid').notNull(),
    encryptedpublickey: text('encryptedpublickey').notNull(),
    encryptedprivatekey: text('encryptedprivatekey').notNull(),
  },
  (table) => ({
    primaryKey: [table.userid, table.custodyAddress, table.deviceid],
  }),
)

export type InsertHash = typeof keyTable.$inferInsert
export type SelectHash = typeof keyTable.$inferSelect

export const messageTable = pgTable('messages', {
  id: text('messageid').primaryKey(),
  signer: text('signer').notNull(),
  messageType: text('messagetype').notNull(),
  messageBody: text('messagebody').notNull(),
  hashType: text('hashtype').notNull(),
  hash: numeric('hash').notNull(),
  sigType: text('sigtype').notNull(),
  sig: text('sig').notNull(),
})

export type InsertPost = typeof messageTable.$inferInsert
export type SelectPost = typeof messageTable.$inferSelect

export const channelTable = pgTable('channels', {
  id: text('messageid')
    .notNull()
    .references(() => messageTable.id)
    .primaryKey(),
  content: text('content').notNull(),
  timestamp: integer('timestamp').notNull(),
  createdById: numeric('createdbyid')
    .notNull()
    .references(() => usersTable.id),
  uri: text('uri').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
})

export type InsertChannel = typeof channelTable.$inferInsert
export type SelectChannel = typeof channelTable.$inferSelect

export const ItemTable = pgTable('items', {
  id: text('messageId')
    .notNull()
    .references(() => messageTable.id)
    .primaryKey(),
  createdById: numeric('createdbyid')
    .notNull()
    .references(() => usersTable.id),
  uri: text('uri').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
})

export type InsertItem = typeof ItemTable.$inferInsert
export type SelectItem = typeof ItemTable.$inferSelect

export const submissionsTable = pgTable('submissions', {
  id: text('messageId')
    .notNull()
    .references(() => messageTable.id)
    .primaryKey(),
  content: text('content').notNull(),
  userId: numeric('userid')
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
})

export type InsertSubmission = typeof submissionsTable.$inferInsert
export type SelectSubmission = typeof submissionsTable.$inferSelect

export const acceptedRejectedTable = pgTable('acceptedrejected', {
  messageId: text('messageId')
    .notNull()
    .references(() => messageTable.id)
    .primaryKey(),
  submissionId: text('submissionid')
    .notNull()
    .references(() => submissionsTable.id),
  response: text('response').notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
})

export type InsertacceptedRejected = typeof acceptedRejectedTable.$inferInsert
export type SelectacceptedRejected = typeof acceptedRejectedTable.$inferSelect
