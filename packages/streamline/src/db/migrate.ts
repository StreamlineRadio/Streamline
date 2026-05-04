import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { getDb } from './index';

export function runMigrations(): void {
	const db = getDb();
	migrate(db, { migrationsFolder: join(__dirname, 'migrations') });
}
