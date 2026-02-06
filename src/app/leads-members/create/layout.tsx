import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Create Lead',
  description: 'Create a new lead.',
};

export default function CreateLeadLayout({
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
