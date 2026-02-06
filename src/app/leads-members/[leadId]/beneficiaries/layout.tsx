import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Beneficiaries',
  description: 'Beneficiary list for the lead.',
};

export default function BeneficiaryLayout({
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
