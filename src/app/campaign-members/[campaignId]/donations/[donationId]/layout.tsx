import type {Metadata} from 'next';
import '../../../../globals.css';

export const metadata: Metadata = {
  title: 'Donation Details',
  description: 'Details for a specific donation.',
};

export default function DonationDetailLayout({
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
