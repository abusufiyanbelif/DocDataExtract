import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Create Campaign',
  description: 'Create a new campaign.',
};

export default function CreateCampaignLayout({
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
