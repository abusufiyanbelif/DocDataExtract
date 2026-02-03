import type {Metadata} from 'next';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'Campaign Details',
  description: 'Details for the ration campaign.',
};

export default function CampaignDetailLayout({
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
