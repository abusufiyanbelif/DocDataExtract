import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Public Campaigns',
  description: 'View our ongoing and completed campaigns.',
};

export default function PublicCampaignLayout({
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
