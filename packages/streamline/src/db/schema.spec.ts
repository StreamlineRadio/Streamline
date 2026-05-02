import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { join } from 'path'
import * as schema from './schema'

function makeTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(__dirname, 'migrations') })
  return db
}

describe('database schema', () => {
  it('can insert and retrieve a song', () => {
    const db = makeTestDb()
    db.insert(schema.songs).values({
      id: 'hash-abc',
      path: '/music/test.mp3',
      addedAt: Date.now(),
      playCount: 0,
      missing: false
    }).run()
    const songs = db.select().from(schema.songs).all()
    expect(songs).toHaveLength(1)
    expect(songs[0].path).toBe('/music/test.mp3')
  })

  it('cascades delete of module_instances when layout is deleted', () => {
    const db = makeTestDb()
    const now = Date.now()
    db.insert(schema.layouts).values({ id: 'layout-1', name: 'Test', isActive: false, createdAt: now, updatedAt: now }).run()
    db.insert(schema.moduleInstances).values({ id: 'inst-1', layoutId: 'layout-1', moduleId: 'deck', title: 'Deck A', x: 0, y: 0, width: 400, height: 300, zIndex: 1, minimized: false, settingsJson: '{}' }).run()
    db.delete(schema.layouts).where(eq(schema.layouts.id, 'layout-1')).run()
    const instances = db.select().from(schema.moduleInstances).all()
    expect(instances).toHaveLength(0)
  })

  it('runs migration twice without error (idempotent)', () => {
    const sqlite = new Database(':memory:')
    const db = drizzle(sqlite, { schema })
    const migrationsFolder = join(__dirname, 'migrations')
    expect(() => {
      migrate(db, { migrationsFolder })
      migrate(db, { migrationsFolder })
    }).not.toThrow()
  })
})
