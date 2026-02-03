import type {Metadata} from 'next';
import '../../../globals.css';

export const metadata: Metadata = {
  title: 'Campaign Summary',
  description: 'Summary for the campaign.',
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
