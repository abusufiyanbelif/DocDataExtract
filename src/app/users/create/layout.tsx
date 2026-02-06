import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Create User',
  description: 'Create a new user for the application.',
};

export default function CreateUserLayout({
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
