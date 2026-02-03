import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Donations',
  description: 'Manage all donations.',
};

export default function DonationsLayout({
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
