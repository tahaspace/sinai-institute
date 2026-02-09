import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
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

        // 🔧 Temporary: Hardcoded admin for local development (check FIRST before DB)
        if (credentials.email === 'admin@sainaiinstitute.com' && 
            credentials.password === 'admin123') {
          return {
            id: 'dev-admin-001',
            email: 'admin@sainaiinstitute.com',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
          };
        }

        // If not hardcoded admin, reject (since DB is not working yet)
        // TODO: Enable DB authentication when MySQL is configured
        throw new Error('بيانات الدخول غير صحيحة');

        /* Database authentication (disabled for now)
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user) {
            throw new Error('بيانات الدخول غير صحيحة');
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('بيانات الدخول غير صحيحة');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          throw new Error('بيانات الدخول غير صحيحة');
        }
        */
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
