
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-5xl md:text-6xl font-bold font-headline text-foreground mb-4">
          Welcome
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Your application is running. You can now start building your features.
        </p>
      </div>
    </div>
  );
}
