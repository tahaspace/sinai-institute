import { Metadata } from 'next';
import PublicHeader from '@/components/layouts/public-header';
import PublicFooter from '@/components/layouts/public-footer';

export const metadata: Metadata = {
  title: 'معهد سيناء العالي للدراسات النوعية',
  description: 'Sinai Higher Institute for Specific Studies - Your Gateway to Excellence',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
