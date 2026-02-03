// src/app/env-check/page.tsx
'use client';

export default function EnvCheck() {
  console.log('CLIENT ENV CHECK', {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  });

  return <div>Open DevTools console</div>;
}