import type {Metadata} from 'next';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Public Campaigns - Baitulmal Samajik Sanstha Solapur',
  description: 'View our ongoing and past campaigns.',
};

export default function PublicLayout({
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
