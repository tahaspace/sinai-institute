import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any), // prisma is $extends-wrapped; adapter typing expects the base client
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  // ClientR3: capture login events for the audit/login report. Runs AFTER a successful
  // sign-in and never affects the auth result (failure here is swallowed).
  events: {
    async signIn({ user }) {
      try {
        await prisma.auditLog.create({
          data: { action: 'auth.login', actorUserId: (user as { id?: string }).id ?? user.email ?? null, targetType: 'User', metadata: { email: user.email } },
        });
      } catch {
        /* never break sign-in on an audit write */
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        // Hardcoded super-admin shortcut (checked first, for CMS access).
        if (credentials.email === 'admin@sainaiinstitute.com' &&
            credentials.password === 'admin123') {
          return {
            id: 'dev-admin-001',
            email: 'admin@sainaiinstitute.com',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
          };
        }

        // DB-backed authentication (students + staff in the User table).
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error('بيانات الدخول غير صحيحة');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, stamp identity. (loadAuthContext is imported lazily to avoid
      // pulling Prisma into the Edge middleware bundle, which only reads the token.)
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      // (Re)hydrate the RBAC context on sign-in or once the cached copy is stale (>5 min).
      const FIVE_MIN = 5 * 60 * 1000;
      const stamp = (token.authStamp as number | undefined) ?? 0;
      const isStale = Date.now() - stamp > FIVE_MIN;
      if ((user || isStale) && token.id) {
        const { loadAuthContext } = await import('@/lib/authz');
        const ctx = await loadAuthContext(token.id as string, token.role as string);
        token.universityId = ctx.universityId;
        token.isPlatformAdmin = ctx.isPlatformAdmin;
        token.roleKeys = ctx.roleKeys;
        token.permissions = ctx.permissions;
        token.scope = ctx.scope;
        token.disabledFeatures = ctx.disabledFeatures;
        token.authStamp = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.universityId = (token.universityId as string | null) ?? null;
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
        session.user.roleKeys = (token.roleKeys as string[]) ?? [];
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.scope = (token.scope as { facultyIds: string[]; departmentIds: string[] }) ?? { facultyIds: [], departmentIds: [] };
        session.user.disabledFeatures = (token.disabledFeatures as string[]) ?? [];
      }
      return session;
    },
  },
};
