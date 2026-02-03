import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Campaigns',
  description: 'Manage and track campaigns.',
};

export default function CampaignLayout({
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
