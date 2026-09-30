import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserByEmail } from '@/lib/repos/usersRepo';
import bcrypt from 'bcryptjs';
import initialSeedData from '../../../../data/initial-data.json';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forceSeed = url.searchParams.get('seed') === 'true';

  let neonDirectWrite = false;
  let neonError: string | null = null;

  let users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];

  // If forced or if users count is 0, seed directly into Neon PostgreSQL
  if (forceSeed || users.length === 0) {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (dbUrl) {
      try {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(dbUrl);
        const queryFn = sql.query ? sql.query.bind(sql) : sql;
        await queryFn(`
          CREATE TABLE IF NOT EXISTS quickfinsure_store (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        const jsonStr = JSON.stringify(initialSeedData);
        await queryFn(
          `INSERT INTO quickfinsure_store (key, value, updated_at) 
           VALUES ('main_store', $1::jsonb, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
          [jsonStr]
        );
        neonDirectWrite = true;
      } catch (err) {
        neonError = (err as Error).message;
      }
    }
    // Re-query after seed
    users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];
  }

  const admin = getUserByEmail('admin@quickfinsure.com');
  const passwordCheck = admin ? await bcrypt.compare('Password123!', admin.passwordHash) : false;

  return NextResponse.json({
    version: 'v5-auto-neon-seeded',
    neonDirectWrite,
    neonError,
    databaseUrlSet: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    renderUrl: process.env.RENDER_EXTERNAL_URL || 'NOT_SET',
    totalUsers: users.length,
    userEmails: users.map((u) => ({ email: u.email, role: u.role, active: u.active })),
    adminFound: !!admin,
    passwordMatch: passwordCheck,
  });
}
