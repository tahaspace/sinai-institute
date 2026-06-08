import { DefaultSession } from 'next-auth';

interface RbacFields {
  universityId: string | null;
  isPlatformAdmin: boolean;
  roleKeys: string[];
  permissions: string[];
  scope: { facultyIds: string[]; departmentIds: string[] };
  disabledFeatures: string[];
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string; // legacy primary-role string (kept for back-compat)
    } & RbacFields &
      DefaultSession['user'];
  }

  interface User {
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends RbacFields {
    role: string;
    id: string;
    authStamp?: number; // epoch ms of last context load (staleness refresh)
  }
}
