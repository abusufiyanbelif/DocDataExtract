
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
<<<<<<< HEAD
    <main className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto text-center mt-10">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Baitulmal Samajik Sanstha Solapur</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Managing and tracking community support campaigns efficiently. View our public campaigns or log in to manage your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/campaign-public">View Public Campaigns</Link>
          </Button>
           <Button asChild variant="outline" size="lg">
            <Link href="/leads-public">View Public Leads</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
=======
    <div className="min-h-screen text-foreground flex flex-col">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8 flex-grow">
        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                ))}
            </div>
        ) : userProfile ? (
          <>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
                Welcome back, {userProfile.name}!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCards.map((card) => (
                <Link href={card.href} key={card.title} className="group">
                    <Card className="h-full hover:shadow-lg hover:border-primary transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        {card.icon}
                        <div className="flex-1">
                        <CardTitle>{card.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>{card.description}</CardDescription>
                    </CardContent>
                    </Card>
                </Link>
                ))}
            </div>
          </>
        ) : (
           <Card className="max-w-2xl mx-auto text-center mt-10">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Welcome to Baitulmal Samajik Sanstha Solapur</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground pt-2">
                        Managing and tracking community support campaigns efficiently. View our public campaigns or log in to manage your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link href="/campaign-public">View Public Campaigns</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/leads-public">View Public Leads</Link>
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                        <Link href="/login">Member Login</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
      </main>
    </div>
  );
}

    
>>>>>>> b801c4913b8f519048c191e413de6d9c3ca543da
