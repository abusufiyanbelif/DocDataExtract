import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'System Diagnostics',
  description: 'Check the status of system connections and resources.',
};

export default function DiagnosticsLayout({
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
