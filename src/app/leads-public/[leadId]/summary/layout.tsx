import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Lead Summary',
  description: 'Public summary for the lead.',
};

export default function PublicLeadSummaryLayout({
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
