import { db } from './db.js'
import { type InsertUser, usersTable } from './schema.js'

export async function createUser(data: InsertUser) {
  await db.insert(usersTable).values(data)
}
