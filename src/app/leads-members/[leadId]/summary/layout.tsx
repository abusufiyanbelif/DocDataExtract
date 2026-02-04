import type {Metadata} from 'next';
import '../../../globals.css';

export const metadata: Metadata = {
  title: 'Lead Summary',
  description: 'Summary for the lead.',
};

export default function SummaryLayout({
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
