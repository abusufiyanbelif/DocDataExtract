import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Main dashboard for the application.',
};

export default function DashboardLayout({
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
