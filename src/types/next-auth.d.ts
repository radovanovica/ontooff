import NextAuth from 'next-auth';
import { UserRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      isActive: boolean;
    };
  }

  interface User {
    role?: UserRole;
    isActive?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    isActive?: boolean;
  }
}
