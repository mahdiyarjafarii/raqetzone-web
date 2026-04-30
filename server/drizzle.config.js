import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.js',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});

