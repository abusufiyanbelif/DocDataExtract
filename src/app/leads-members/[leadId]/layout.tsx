import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Lead Details',
  description: 'Details for the lead.',
};

export default function LeadDetailLayout({
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
