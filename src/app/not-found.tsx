
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem', color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--background))', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>404 - Page Not Found</h1>
      <p style={{ margin: '1rem 0', fontSize: '1.125rem' }}>Oops! The page you are looking for does not exist or has been moved.</p>
      <Link href="/" style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', fontSize: '1.125rem' }}>
        Go back to Home
      </Link>
    </div>
  );
}
