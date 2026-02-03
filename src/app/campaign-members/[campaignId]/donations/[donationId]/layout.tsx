import type {Metadata} from 'next';
import '../../../../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Donation Details',
  description: 'Details for a specific donation.',
};

export default function DonationDetailLayout({
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
