import type {Metadata} from 'next';

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
