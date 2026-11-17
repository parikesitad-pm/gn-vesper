import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

export interface WatchStore {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  entries<T>(prefix: string): Promise<{ key: string; value: T }[]>;
  once(key: string, value: unknown): Promise<boolean>;
}

export function createFileStore(directory: string): WatchStore {
  let queue = Promise.resolve();
  const path = join(resolve(directory), "watcher.json");
  const transact = <T>(operation: (records: Record<string, unknown>) => T, write = false): Promise<T> => {
    const result = queue.then(async () => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      let records: Record<string, unknown> = {};
      try { records = JSON.parse(await readFile(path, "utf8")); } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
      const value = operation(records);
      if (write) {
        const temporary = `${path}.${randomUUID()}`;
        await writeFile(temporary, JSON.stringify(records), { mode: 0o600, flag: "wx" });
        await rename(temporary, path);
      }
      return value;
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
  return {
    get: <T>(key: string) => transact(records => records[key] as T ?? null),
    put: (key, value) => transact(records => { records[key] = value; }, true),
    remove: key => transact(records => { delete records[key]; }, true),
    entries: <T>(prefix: string) => transact(records => Object.entries(records).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, value: value as T }))),
    once: (key, value) => transact(records => { if (key in records) return false; records[key] = value; return true; }, true),
  };
}

function createPostgresStore(url: string): WatchStore {
  const sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10, prepare: false });
  let initialized: Promise<unknown> | null = null;
  const ready = () => initialized ??= sql`CREATE TABLE IF NOT EXISTS vesper_watch (key text PRIMARY KEY, value jsonb NOT NULL)`;
  return {
    async get<T>(key: string) { await ready(); const rows = await sql`SELECT value FROM vesper_watch WHERE key = ${key}`; return rows[0]?.value as T ?? null; },
    async put(key, value) { await ready(); await sql`INSERT INTO vesper_watch (key,value) VALUES (${key},${sql.json(JSON.parse(JSON.stringify(value)))}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`; },
    async remove(key) { await ready(); await sql`DELETE FROM vesper_watch WHERE key = ${key}`; },
    async entries<T>(prefix: string) { await ready(); const rows = await sql`SELECT key,value FROM vesper_watch WHERE starts_with(key, ${prefix})`; return rows.map(row => ({ key: String(row.key), value: row.value as T })); },
    async once(key, value) { await ready(); const rows = await sql`INSERT INTO vesper_watch (key,value) VALUES (${key},${sql.json(JSON.parse(JSON.stringify(value)))}) ON CONFLICT DO NOTHING RETURNING key`; return rows.length > 0; },
  };
}

let singleton: WatchStore | undefined;
export function watchStore() {
  if (!singleton) {
    if (process.env.VERCEL && !process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for durable hosted storage.");
    singleton = process.env.DATABASE_URL ? createPostgresStore(process.env.DATABASE_URL) : createFileStore(process.env.VESPER_DATA_DIR || join(process.cwd(), ".vesper"));
  }
  return singleton;
}
