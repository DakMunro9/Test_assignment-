import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let sharedClient: Client | null = null;

const getDatabaseUrl = (): string => {
  const { DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  return DATABASE_URL;
};

export const createTables = async (client: Client): Promise<void> => {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_name VARCHAR(255) UNIQUE NOT NULL,
      count INTEGER NOT NULL,
      version INTEGER DEFAULT 0
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);
};

export const seedData = async (client: Client): Promise<void> => {
  await client.query(`
    INSERT INTO inventory (item_name, count)
    VALUES ('Pfizer-Batch-A', 500)
    ON CONFLICT (item_name)
    DO UPDATE SET count = EXCLUDED.count;
  `);

  await client.query('DELETE FROM reservations;');
};

export const getDbClient = async (): Promise<Client> => {
  if (sharedClient) {
    return sharedClient;
  }

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  sharedClient = client;
  return client;
};

export const initializeDatabase = async (): Promise<void> => {
  const client = await getDbClient();

  try {
    await createTables(client);

    if (process.env.NODE_ENV !== 'production') {
      await seedData(client);
    }

    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (!sharedClient) {
    return;
  }

  await sharedClient.end();
  sharedClient = null;
};
