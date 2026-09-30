import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById } from '@/lib/repos/usersRepo';
import type { Role, User } from '@/types/db';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        console.log('[auth] Attempting login for:', email);
        const user = getUserByEmail(email);
        if (!user) {
          console.log('[auth] No user found for email:', email);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        console.log('[auth] Password valid for', email, ':', isValid, '| Active:', user.active);

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          branchName: user.branchName || 'Head Office',
          tenantId: user.tenantId || 'default',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: Role }).role;
        token.branchId = (user as unknown as { branchId: string }).branchId;
        token.branchName = (user as unknown as { branchName: string }).branchName;
        token.tenantId = (user as unknown as { tenantId: string }).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.branchId = token.branchId as string;
        session.user.branchName = token.branchName as string;
        session.user.tenantId = (token.tenantId as string) || 'default';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'quickfinsure-whitelabel-secret-key-2026-production',
};

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireUser(): Promise<User & { branchName: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = getUserById(session.user.id);
  if (!user || !user.active) {
    redirect('/login');
  }

  return {
    ...user,
    branchName: user.branchName || session.user.branchName || 'Head Office',
  };
}

export async function requireRole(...allowedRoles: Role[]): Promise<User & { branchName: string }> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
