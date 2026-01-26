import type {Metadata} from 'next';
import '../../../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Beneficiaries - Ration Kit Distribution Ramza 2026',
  description: 'Beneficiary list for the Ration Kit Distribution Ramza 2026 campaign.',
};

export default function BeneficiaryLayout({
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
