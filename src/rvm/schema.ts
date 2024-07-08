import {
  integer,
  pgTable,
  text,
  bigint,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/*
 * ****************
 * AUTH (PRIVATE)
 * ****************
 */

export const authTable = pgTable("auth", {
  id: text("id").primaryKey(), // email and/or hash of user email
  magicLinkStatus: integer("magiclink_status"),
  passkeyEncodedPubKey: text("passkey_encoded_pubkey"),
  deterministicSmartAccount: text("deterministic_smart_account"),
  rid: bigint("rid", { mode: "bigint" }),
  encryptedSigningKey: text("encrypted_signing_key"),
});

export const authRelations = relations(authTable, ({ one }) => ({
  userInfo: one(userTable, {
    fields: [authTable.rid],
    references: [userTable.id],
  }),
}));

/*
 * ****************
 * USERS
 * ****************
 */

export const userTable = pgTable("users", {
  id: bigint("id", { mode: "bigint" }),
  custodyAddress: text("custody_address"),
  recoveryAddress: text("recovery_address"),
});

export const userRelations = relations(userTable, ({ one, many }) => ({
  keyInfo: many(keyTable)
}));

/*
 * ****************
 * KEYS
 * ****************
 */

export const keyTable = pgTable("key_info", {
  id: bigint("id", { mode: "bigint" }),
  rid: bigint("rid", { mode: "bigint" }),
  publickKeyBytes: text("public_key_bytes"),
  status: integer("status") // 0 = null, 1 = added, 2 = removed
});

export const keyRelations = relations(keyTable, ({ one }) => ({
  userInfo: one(userTable, {
    fields: [keyTable.rid],
    references: [userTable.id],
  }),
}));


/*
 * ****************
 * MESSAGES
 * ****************
 */

export const messageTable = pgTable("messages", {
  id: text("id").primaryKey(),
  rid: bigint("rid", { mode: "bigint" }),
  timestamp: bigint("timestamp", { mode: "bigint" }),
  type: integer("type"),
  body: text("body"), // this will be JSON.stringified message body object
  signer: text("signer"),
  hashType: integer("hashtype"),
  hash: text("hash"),
  sigType: integer("sigtype"),
  sig: text("sig"),
});

/*
 * ****************
 * URI
 * ****************
 */

export const uriInfo = pgTable("uri_info", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  imageUri: text("imageuri"),
  animationUri: text("animationuri"),
});

/*
 * ****************
 * CHANNELS
 * ****************
 */

export const channelTable = pgTable("channels", {
  id: text("id").primaryKey(),
  createdBy: bigint("createdby", { mode: "bigint" }),
  uri: text("uri"),
});

export const channelRelations = relations(channelTable, ({ one, many }) => ({
  uriInfo: one(uriInfo, {
    fields: [channelTable.uri],
    references: [uriInfo.id],
  }),
  submissions: many(submissionsTable),
}));

/*
 * ****************
 * ITEMS
 * ****************
 */

export const itemTable = pgTable("items", {
  id: text("id").primaryKey(),
  createdBy: bigint("createdby", { mode: "bigint" }),
  uri: text("uri"),
});

export const itemRelations = relations(itemTable, ({ one, many }) => ({
  uriInfo: one(uriInfo, {
    fields: [itemTable.uri],
    references: [uriInfo.id],
  }),
  submissionTable: many(submissionsTable),
}));

/*
 * ****************
 * SUBMISSIONS
 * ****************
 */

export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey(),
  createdBy: bigint("createdby", { mode: "bigint" }),
  status: integer("status"), // 0 = pending | 1 = rejected | 2 = accepted | 3 = owner submission
  itemId: text("itemid").notNull(),
  channelId: text("channelid").notNull(),
  response: text("response"),
});

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
}));

/*
 * ****************
 * RESPONSES
 * ****************
 */

// TODO: unsolved not able to render all of responesInfo when querying submissionTable
// reserach more into foreign keys

export const responseInfo = pgTable("response_info", {
  id: text("id").primaryKey(),
  targetMessageId: text("targetmessageid").references(
    () => submissionsTable.id
  ),
  response: boolean("response"),
});
