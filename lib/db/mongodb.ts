import {
  MongoClient,
  MongoServerError,
  ServerApiVersion,
  type ClientSession,
  type Collection,
  type Db,
} from "mongodb";
import type {
  GroupDocument,
  LinkDocument,
  UserDocument,
} from "@/lib/db/types";

const DEFAULT_DATABASE_NAME = "memory404";

type MongoGlobals = typeof globalThis & {
  __memory404MongoClientPromise?: Promise<MongoClient>;
  __memory404MongoIndexPromise?: Promise<void>;
};

const mongoGlobals = globalThis as MongoGlobals;

function mongoUri(): string {
  return process.env.MONGODB_URI?.trim() ?? "";
}

export function mongoDatabaseName(): string {
  return process.env.MONGODB_DB?.trim() || DEFAULT_DATABASE_NAME;
}

export function getMongoEnvError(): string | null {
  if (!mongoUri()) {
    return "Database is not configured: set MONGODB_URI in .env.local and restart the server.";
  }
  return null;
}

function createClient(): MongoClient {
  const uri = mongoUri();
  if (!uri) throw new Error(getMongoEnvError() ?? "MONGODB_URI is missing");

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 20,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 10_000,
  });
}

export function getMongoClient(): Promise<MongoClient> {
  if (!mongoGlobals.__memory404MongoClientPromise) {
    const client = createClient();
    mongoGlobals.__memory404MongoClientPromise = client.connect().catch((error) => {
      mongoGlobals.__memory404MongoClientPromise = undefined;
      throw error;
    });
  }
  return mongoGlobals.__memory404MongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(mongoDatabaseName());
}

export type MongoCollections = {
  users: Collection<UserDocument>;
  groups: Collection<GroupDocument>;
  links: Collection<LinkDocument>;
};

export async function getCollections(): Promise<MongoCollections> {
  const db = await getMongoDb();
  return {
    users: db.collection<UserDocument>("users"),
    groups: db.collection<GroupDocument>("groups"),
    links: db.collection<LinkDocument>("links"),
  };
}

export async function pingMongo(): Promise<void> {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
}

export async function closeMongo(): Promise<void> {
  const promise = mongoGlobals.__memory404MongoClientPromise;
  mongoGlobals.__memory404MongoClientPromise = undefined;
  mongoGlobals.__memory404MongoIndexPromise = undefined;
  if (promise) {
    const client = await promise;
    await client.close();
  }
}

export async function withMongoTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await getMongoClient();
  return client.withSession((session) =>
    session.withTransaction(() => operation(session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    }),
  );
}

export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export function escapeMongoRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function ensureMongoIndexes(): Promise<void> {
  if (!mongoGlobals.__memory404MongoIndexPromise) {
    mongoGlobals.__memory404MongoIndexPromise = (async () => {
      const { users, groups, links } = await getCollections();

      await Promise.all([
        users.createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
        groups.createIndex(
          { userId: 1, name: 1 },
          { unique: true, name: "groups_user_name_unique" },
        ),
        groups.createIndex(
          { userId: 1, sortOrder: 1 },
          { name: "groups_user_sort_order" },
        ),
        groups.createIndex(
          { parentGroupId: 1 },
          { name: "groups_parent_group_id" },
        ),
        groups.createIndex(
          { userId: 1, deletedAt: 1 },
          { name: "groups_user_deleted_at" },
        ),
        links.createIndex(
          { userId: 1, url: 1 },
          { unique: true, name: "links_user_url_unique" },
        ),
        links.createIndex({ groupId: 1 }, { name: "links_group_id" }),
        links.createIndex(
          { createdAt: -1, _id: -1 },
          { name: "links_created_id_desc" },
        ),
        links.createIndex({ deletedAt: 1 }, { name: "links_deleted_at" }),
        links.createIndex(
          { userId: 1, deletedAt: 1, createdAt: -1, _id: -1 },
          { name: "links_user_deleted_created_id" },
        ),
        links.createIndex(
          { userId: 1, groupId: 1, deletedAt: 1, createdAt: -1, _id: -1 },
          { name: "links_user_group_deleted_created_id" },
        ),
        links.createIndex({ tags: 1 }, { name: "links_tags" }),
      ]);
    })().catch((error) => {
      mongoGlobals.__memory404MongoIndexPromise = undefined;
      throw error;
    });
  }
  return mongoGlobals.__memory404MongoIndexPromise;
}
