import type {Metadata} from 'next';

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
