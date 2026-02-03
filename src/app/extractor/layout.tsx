import type {Metadata} from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Extractor',
  description: 'Scan images and documents to extract text and structured data.',
};

export default function ExtractorLayout({
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
