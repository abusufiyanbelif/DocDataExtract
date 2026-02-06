import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage users for the application.',
};

export default function UsersLayout({
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
