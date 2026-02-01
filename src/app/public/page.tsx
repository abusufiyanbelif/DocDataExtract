'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function PublicCampaignsPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const campaignsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'campaigns');
  }, [firestore]);

  const { data: campaigns, isLoading: areCampaignsLoading } = useCollection<Campaign>(campaignsCollectionRef);

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/summary`);
  };

  const filteredAndSortedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    let sortableItems = [...campaigns].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    // Filtering
    if (statusFilter !== 'All') {
        sortableItems = sortableItems.filter(c => c.status === statusFilter);
    }
    if (categoryFilter !== 'All') {
        sortableItems = sortableItems.filter(c => c.category === categoryFilter);
    }
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        sortableItems = sortableItems.filter(c => 
            c.name.toLowerCase().includes(lowercasedTerm)
        );
    }

    return sortableItems;
  }, [campaigns, searchTerm, statusFilter, categoryFilter]);

  const isLoading = areCampaignsLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        
        <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold">Our Campaigns</h1>
            <p className="text-muted-foreground mt-2">Browse through our current and past initiatives.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
                <Input 
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                    disabled={isLoading}
                />
                 <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
                    <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                    <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        <SelectItem value="Ration">Ration</SelectItem>
                        <SelectItem value="Relief">Relief</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!isLoading && filteredAndSortedCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedCampaigns.map(campaign => (
                  <Card key={campaign.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleRowClick(campaign.id)}>
                    <CardHeader>
                      <CardTitle className="truncate">{campaign.name}</CardTitle>
                      <CardDescription>{campaign.startDate} to {campaign.endDate}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>{campaign.status}</span>
                            <Badge variant="secondary">{campaign.category}</Badge>
                        </div>
                        <Progress value={campaign.status === 'Completed' ? 100 : campaign.status === 'Active' ? 50 : 0} className="h-2" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description || 'No description available.'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
                !isLoading && (
                     <div className="text-center text-muted-foreground py-16">
                        <p>No campaigns found matching your criteria.</p>
                    </div>
                )
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
