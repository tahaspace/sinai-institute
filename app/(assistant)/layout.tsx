import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'بوابة المعيد - معهد سيناء العالي',
  description: 'Teaching Assistant Portal',
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
