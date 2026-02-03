import type {Metadata} from 'next';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'Donations Summary',
  description: 'A summary of all donations.',
};

export default function DonationsSummaryLayout({
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
