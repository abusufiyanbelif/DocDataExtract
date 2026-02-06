import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Setup & Data Migration',
  description: 'Initialize and migrate the database.',
};

export default function SeedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}
