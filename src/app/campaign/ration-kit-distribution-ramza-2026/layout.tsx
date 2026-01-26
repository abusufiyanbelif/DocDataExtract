import type {Metadata} from 'next';
import '../../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Ration Kit Distribution Ramza 2026 - DocDataExtract AB',
  description: 'Details for the Ration Kit Distribution Ramza 2026 campaign.',
};

export default function CampaignDetailLayout({
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
