import type {Metadata} from 'next';
import '../globals.css';

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
