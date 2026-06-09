'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

// Post-login landing by role (kept in sync with middleware.ts LANDING).
const LANDING: Array<[string, string]> = [
  ['INSTITUTE_ADMIN', '/institute/dashboard'],
  ['FACULTY_ADMIN', '/institute/dashboard'],
  ['DEPARTMENT_HEAD', '/institute/dashboard'],
  ['CFO', '/institute/finance/cfo-dashboard'],
  ['FINANCE', '/institute/accounting/dashboard'],
  ['ACCOUNTANT', '/accountant/dashboard'],
  ['REGISTRAR', '/student-affairs/dashboard'],
  ['ADMISSIONS', '/institute/admission'],
  ['EXAMS_CONTROL', '/institute/exams'],
  ['LIBRARIAN', '/library-admin/dashboard'],
  ['QUALITY', '/institute/quality'],
  ['HR', '/institute/faculty'],
  ['MARKETING', '/institute/marketing'],
  ['PROFESSOR', '/faculty/dashboard'],
  ['TEACHING_ASSISTANT', '/assistant/dashboard'],
  ['CMS_EDITOR', '/cms/dashboard'],
  ['STUDENT', '/student/dashboard'],
  ['PARENT', '/parent/dashboard'],
];

function resolveLanding(
  u: { roleKeys?: string[]; isPlatformAdmin?: boolean; role?: string } | undefined
): string {
  if (u?.isPlatformAdmin) return '/admin/dashboard';
  const keys = u?.roleKeys ?? [];
  for (const [key, path] of LANDING) if (keys.includes(key)) return path;
  // legacy fallback by the old role string
  const legacy: Record<string, string> = {
    STUDENT: '/student/dashboard',
    FACULTY: '/faculty/dashboard',
    PARENT: '/parent/dashboard',
  };
  return (u?.role && legacy[u.role]) || '/cms/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // Route to the landing for the user's RBAC role (mirrors middleware.ts).
        const session = await getSession();
        const u = session?.user as
          | { roleKeys?: string[]; isPlatformAdmin?: boolean; role?: string }
          | undefined;
        router.push(resolveLanding(u));
        router.refresh();
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center"
            >
              <Image
                src="/logo.png"
                alt="معهد سيناء العالي للدراسات النوعية"
                width={400}
                height={120}
                quality={100}
                priority
                className="h-24 w-auto object-contain"
              />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">
                تسجيل الدخول
              </CardTitle>
              <CardDescription>
                لوحة تحكم معهد سيناء العالي
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ادخل الايميل"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="ادخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  'جاري تسجيل الدخول...'
                ) : (
                  <>
                    <LogIn className="ml-2 h-4 w-4" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          Powered by Smart Innovation
        </motion.p>
      </motion.div>
    </div>
  );
}
