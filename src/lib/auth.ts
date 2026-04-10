import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: UserRole.USER,
        };
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error('No account found with this email');
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email address before signing in');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? UserRole.USER;
      }
      // Allow updating session
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.image = session.image;
      }
      // Refresh role from DB on each token refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true, name: true, image: true },
        });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.isActive = dbUser.isActive;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Allow OAuth sign-ins without email verification
      if (account?.provider !== 'credentials') {
        // Auto-set emailVerified for OAuth users
        if (user.email) {
          await prisma.user.update({
            where: { email: user.email },
            data: { emailVerified: new Date() },
          }).catch(() => {
            // User might not exist yet (first sign-in), adapter handles it
          });
        }
        return true;
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Send welcome email for new users
      if (user.email) {
        const { sendWelcomeEmail } = await import('@/lib/email');
        await sendWelcomeEmail(user.email, user.name ?? 'User').catch(console.error);
      }
    },
  },
};
