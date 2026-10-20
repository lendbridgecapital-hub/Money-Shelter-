import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, getUserByUsernameOrPhoneOrEmail } from '@/lib/repos/usersRepo';
import type { Role, User } from '@/types/db';
import initialSeedData from '../../data/initial-data.json';
import { db } from '@/lib/db';

if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes('onrender.com') || process.env.NEXTAUTH_URL.includes('render.com')) {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('onrender.com')) {
    process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NODE_ENV === 'production') {
    process.env.NEXTAUTH_URL = 'https://money-shelter.vercel.app';
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'lendbridge_whitelabel_super_secret_key_change_in_production_2026',
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
        email: { label: 'Mobile Number or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawIdentifier = credentials.email.trim();
        const email = rawIdentifier.toLowerCase();
        console.log('[auth] Attempting login for identifier:', rawIdentifier);
        let user = getUserByUsernameOrPhoneOrEmail(rawIdentifier);

        if (!user && (email.includes('@moneyshelter.') || email.includes('@moneyshelter.in'))) {
          const alternateEmail = email.replace(/@moneyshelter\.(in|com)/, '@quickfinsure.com');
          user = getUserByEmail(alternateEmail);
        } else if (!user && email.includes('@quickfinsure.')) {
          const alternateEmail = email.replace(/@quickfinsure\.(in|com)/, '@moneyshelter.in');
          user = getUserByEmail(alternateEmail);
        }

        // Failsafe: if database is fresh or empty, restore account from initialSeedData
        if (!user) {
          const rawSeed: any = initialSeedData;
          const seed = (rawSeed?.default && (rawSeed.default.users || rawSeed.default.tenants)) ? rawSeed.default : rawSeed;
          const userList = Array.isArray(seed?.users) ? seed.users : [];
          const seedUser = userList.find(
            (u: any) => {
              const uEmail = String(u.email).toLowerCase();
              return uEmail === email || (email.includes('@moneyshelter.') && uEmail === email.replace(/@moneyshelter\.(in|com)/, '@quickfinsure.com'));
            }
          );
          if (seedUser) {
            try {
              db.prepare(
                `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              ).run(
                seedUser.id,
                seedUser.tenant_id || 'default',
                seedUser.name,
                seedUser.email,
                seedUser.password_hash || seedUser.passwordHash,
                seedUser.role,
                seedUser.branch_id || seedUser.branchId || 'default',
                1,
                new Date().toISOString()
              );
              user = getUserByEmail(email);
              console.log('[auth] Restored user from initial seed dataset:', email);
            } catch (err) {
              console.warn('[auth] Could not auto-restore seed user:', err);
            }
          }
        }

        if (!user) {
          console.warn('[auth] No user found for email:', email);
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
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('http://')
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('http://'),
      },
    },
  },
};

export async function auth() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id || session?.user?.email) {
      return session;
    }
  } catch (err) {
    console.warn('[auth] getServerSession exception:', (err as Error).message);
  }

  // Failsafe direct cookie extraction for Server Actions and mobile WebView
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    let sessionCookie =
      cookieStore.get('__Secure-next-auth.session-token')?.value ||
      cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('authjs.session-token')?.value;

    if (!sessionCookie) {
      // Reassemble chunked cookies (__Secure-next-auth.session-token.0, .1, etc.)
      const secureChunks = allCookies
        .filter((c) => c.name.startsWith('__Secure-next-auth.session-token.'))
        .sort((a, b) => {
          const ai = parseInt(a.name.split('.').pop() || '0', 10);
          const bi = parseInt(b.name.split('.').pop() || '0', 10);
          return ai - bi;
        });
      if (secureChunks.length > 0) {
        sessionCookie = secureChunks.map((c) => c.value).join('');
      } else {
        const standardChunks = allCookies
          .filter((c) => c.name.startsWith('next-auth.session-token.'))
          .sort((a, b) => {
            const ai = parseInt(a.name.split('.').pop() || '0', 10);
            const bi = parseInt(b.name.split('.').pop() || '0', 10);
            return ai - bi;
          });
        if (standardChunks.length > 0) {
          sessionCookie = standardChunks.map((c) => c.value).join('');
        }
      }
    }

    if (sessionCookie) {
      const { decode } = await import('next-auth/jwt');
      const secret = (authOptions.secret as string) || 'lendbridge_whitelabel_super_secret_key_change_in_production_2026';
      const decoded = await decode({
        token: sessionCookie,
        secret,
      });

      if (decoded && (decoded.id || decoded.email || decoded.sub)) {
        return {
          user: {
            id: String(decoded.id || decoded.sub || ''),
            name: decoded.name ? String(decoded.name) : undefined,
            email: decoded.email ? String(decoded.email) : undefined,
            role: (decoded.role as Role) || 'CHANNEL_PARTNER',
            branchId: String(decoded.branchId || 'default'),
            branchName: String(decoded.branchName || 'Head Office'),
            tenantId: String(decoded.tenantId || 'default'),
          },
          expires: decoded.exp
            ? new Date(Number(decoded.exp) * 1000).toISOString()
            : new Date(Date.now() + 86400000).toISOString(),
        } as any;
      }
    }
  } catch {
    // next/headers may not be available in non-request contexts
  }

  return null;
}

export async function requireUser(): Promise<User & { branchName: string }> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    redirect('/login');
  }

  let user = session?.user?.id ? getUserById(session.user.id) : undefined;
  if (!user && session?.user?.email) {
    user = getUserByEmail(session.user.email);
  }

  // Failsafe: if database row is temporarily absent, reconstruct valid user from verified JWT
  if (!user && (session.user.id || session.user.email)) {
    const fallbackId = session.user.id || `usr_${Date.now()}`;
    const fallbackEmail = session.user.email || '';
    const fallbackName = session.user.name || 'Channel Partner';
    const fallbackRole = (session.user.role as Role) || 'CHANNEL_PARTNER';
    const fallbackBranchId = session.user.branchId || 'default';
    const fallbackTenantId = session.user.tenantId || 'default';

    user = {
      id: fallbackId,
      tenantId: fallbackTenantId,
      name: fallbackName,
      email: fallbackEmail,
      passwordHash: '',
      role: fallbackRole,
      branchId: fallbackBranchId,
      branchName: session.user.branchName || 'Head Office',
      active: true,
      isBlocked: false,
      blockedReason: null,
      createdAt: new Date().toISOString(),
    };
  }

  if (!user || !user.active) {
    redirect('/login');
  }

  return {
    ...user,
    branchName: user.branchName || session?.user?.branchName || 'Head Office',
  };
}

/**
 * Safe authentication getter for Server Actions.
 * Returns null only if no authenticated session or cookie exists.
 * Automatically recovers user profile from session JWT if not yet in memory table.
 */
export async function getAuthenticatedUser(): Promise<(User & { branchName: string }) | null> {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      console.warn('[auth] getAuthenticatedUser: No session found');
      return null;
    }

    let user = session?.user?.id ? getUserById(session.user.id) : undefined;
    if (!user && session?.user?.email) {
      user = getUserByEmail(session.user.email);
    }

    // Auto-heal: If user has a verified signed session but table row was not found
    if (!user && (session.user.id || session.user.email)) {
      console.log('[auth] Auto-healing user row from verified session token:', session.user.email || session.user.id);
      const rawSeed: any = initialSeedData;
      const seed = (rawSeed?.default && (rawSeed.default.users || rawSeed.default.tenants)) ? rawSeed.default : rawSeed;
      const userList = Array.isArray(seed?.users) ? seed.users : [];
      const seedUser = userList.find(
        (u: any) =>
          (session.user.id && u.id === session.user.id) ||
          (session.user.email && String(u.email).toLowerCase() === session.user.email.toLowerCase())
      );

      if (seedUser) {
        try {
          db.prepare(
            `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            seedUser.id,
            seedUser.tenant_id || 'default',
            seedUser.name,
            seedUser.email,
            seedUser.password_hash || seedUser.passwordHash,
            seedUser.role,
            seedUser.branch_id || seedUser.branchId || 'default',
            1,
            new Date().toISOString()
          );
          user = getUserById(seedUser.id) || getUserByEmail(seedUser.email);
        } catch {}
      }

      if (!user) {
        const fallbackId = session.user.id || `usr_${Date.now()}`;
        const fallbackEmail = session.user.email || '';
        const fallbackName = session.user.name || 'Channel Partner';
        const fallbackRole = (session.user.role as Role) || 'CHANNEL_PARTNER';
        const fallbackBranchId = session.user.branchId || 'default';
        const fallbackTenantId = session.user.tenantId || 'default';

        try {
          db.prepare(
            `INSERT INTO users (id, tenant_id, name, email, password_hash, role, branch_id, active, is_blocked, created_at)
             VALUES (?, ?, ?, ?, '', ?, ?, 1, 0, ?)`
          ).run(
            fallbackId,
            fallbackTenantId,
            fallbackName,
            fallbackEmail,
            fallbackRole,
            fallbackBranchId,
            new Date().toISOString()
          );
        } catch {}

        user = {
          id: fallbackId,
          tenantId: fallbackTenantId,
          name: fallbackName,
          email: fallbackEmail,
          passwordHash: '',
          role: fallbackRole,
          branchId: fallbackBranchId,
          branchName: session.user.branchName || 'Head Office',
          active: true,
          isBlocked: false,
          blockedReason: null,
          createdAt: new Date().toISOString(),
        };
      }
    }

    if (!user || !user.active) {
      return null;
    }

    return {
      ...user,
      branchName: user.branchName || session?.user?.branchName || 'Head Office',
    };
  } catch (err) {
    console.error('[auth] Error in getAuthenticatedUser:', err);
    return null;
  }
}

export async function requireRole(...allowedRoles: Role[]): Promise<User & { branchName: string }> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
