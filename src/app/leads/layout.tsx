import type {Metadata} from 'next';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Leads - DocDataExtract AB',
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
      <Toaster />
    </>
  );
}
