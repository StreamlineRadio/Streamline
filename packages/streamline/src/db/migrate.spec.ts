import { describe, it, expect, vi } from 'vitest';

const { migrateMock } = vi.hoisted(() => ({ migrateMock: vi.fn() }));
vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({ migrate: migrateMock }));

const { mockDb } = vi.hoisted(() => ({ mockDb: {} }));
vi.mock('./index', () => ({ getDb: () => mockDb }));

import { runMigrations } from './migrate';

describe('runMigrations', () => {
	it('calls migrate with the db and a migrationsFolder path', () => {
		runMigrations();
		expect(migrateMock).toHaveBeenCalledWith(
			mockDb,
			expect.objectContaining({ migrationsFolder: expect.stringContaining('migrations') })
		);
	});
});
