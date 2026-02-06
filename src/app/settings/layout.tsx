import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage application settings.',
};

export default function SettingsLayout({
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
