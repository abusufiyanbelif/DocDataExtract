import Link from 'next/link';

export default function Page() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold">Home</h1>
      <p className="text-muted-foreground mt-2">The homepage is loading correctly.</p>
      <p className="mt-4">
        <Link href="/login" className="text-primary underline">Proceed to Login</Link>
      </p>
    </div>
  );
}
