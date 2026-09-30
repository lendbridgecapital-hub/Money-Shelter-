import { DefaultSession } from 'next-auth';
import type { Role } from '@/types/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      branchId: string;
      branchName: string;
      tenantId: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    branchId: string;
    branchName: string;
    tenantId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    branchId: string;
    branchName: string;
    tenantId: string;
  }
}
