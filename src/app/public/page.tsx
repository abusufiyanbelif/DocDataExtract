'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page is a redirect handler.
 * The original content of this page was causing a server error because it
 * was trying to use client-side libraries in a Server Component.
 * The correct public page for campaigns is now at /campaign-public.
 */
export default function PublicRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/campaign-public');
  }, [router]);

  // Return null as the redirect will happen client-side
  return null;
}
