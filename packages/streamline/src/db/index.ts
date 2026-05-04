import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import * as schema from './schema'

let _sqlite: InstanceType<typeof Database> | null = null
let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) throw new Error('DB not initialized — call openDb() first')
  return _db
}

export function openDb(): void {
  const dbPath = join(app.getPath('userData'), 'streamline.db')
  _sqlite = new Database(dbPath)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')
  _db = drizzle(_sqlite, { schema })
}

export function closeDb(): void {
  _sqlite?.close()
  _sqlite = null
  _db = null
}

export { schema }
