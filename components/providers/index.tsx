'use client';

import { ThemeProvider } from './theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from './session-provider';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-center" />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
