import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Leads',
  description: 'Manage and track leads.',
};

export default function LeadLayout({
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
