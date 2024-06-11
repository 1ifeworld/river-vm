import { db } from './db.js'
import { InsertUser, usersTable } from './schema.js'

export async function createUser(data: InsertUser) {
  await db.insert(usersTable).values(data)
}
