import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Application dashboard for authenticated users.',
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
