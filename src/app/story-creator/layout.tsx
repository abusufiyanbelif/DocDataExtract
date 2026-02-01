import type {Metadata} from 'next';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Story Creator',
  description: 'Scan images and documents to extract text and structured data.',
};

export default function StoryCreatorLayout({
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
