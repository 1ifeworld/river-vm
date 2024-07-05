import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/rvm/schema.ts',
  out: './src/rvm/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
