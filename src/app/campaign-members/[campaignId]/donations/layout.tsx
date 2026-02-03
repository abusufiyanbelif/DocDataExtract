import type {Metadata} from 'next';
import '../../../globals.css';

export const metadata: Metadata = {
  title: 'Donations',
  description: 'Donations for the campaign.',
};

export default function DonationLayout({
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
