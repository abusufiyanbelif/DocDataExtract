import type {Metadata} from 'next';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'User Details',
  description: 'View and edit a user profile.',
};

export default function UserDetailsLayout({
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
