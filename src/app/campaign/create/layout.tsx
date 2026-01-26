import type {Metadata} from 'next';
import '../../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Create Ration Campaign - DocDataExtract AB',
  description: 'Create a new ration campaign.',
};

export default function CreateCampaignLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
