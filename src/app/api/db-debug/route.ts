import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserByEmail } from '@/lib/repos/usersRepo';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = (db.prepare('SELECT id, email, role, active, password_hash FROM users').all() || []) as Record<string, unknown>[];
  const admin = getUserByEmail('admin@quickfinsure.com');
  const passwordCheck = admin ? await bcrypt.compare('Password123!', admin.passwordHash) : false;

  return NextResponse.json({
    databaseUrlSet: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    renderUrl: process.env.RENDER_EXTERNAL_URL || 'NOT_SET',
    totalUsers: users.length,
    userEmails: users.map((u) => ({ email: u.email, role: u.role, active: u.active })),
    adminFound: !!admin,
    passwordMatch: passwordCheck,
  });
}
