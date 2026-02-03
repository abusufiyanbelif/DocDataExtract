
'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Lead } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { collection } from 'firebase/firestore';


export default function PublicLeadPage() {
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const leadsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'leads');
  }, [firestore]);

  const { data: leads, isLoading } = useCollection<Lead>(leadsCollectionRef);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => 
        l.authenticityStatus === 'Verified' &&
        l.publicVisibility === 'Published' &&
        (statusFilter === 'All' || l.status === statusFilter) &&
        (categoryFilter === 'All' || l.category === categoryFilter) &&
        (l.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [leads, searchTerm, statusFilter, categoryFilter]);
  
  return (
    <div className="min-h-screen text-foreground">
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
        <div className="space-y-4 mb-8">
            <h1 className="text-4xl font-bold">Our Initiatives</h1>
            <p className="text-muted-foreground text-lg">Browse our verified and published leads for community support.</p>
            <div className="flex flex-wrap items-center gap-2 pt-4">
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
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                         <SelectItem value="Upcoming">Upcoming</SelectItem>
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
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        )}
        
        {!isLoading && filteredLeads.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeads.map(lead => (
                    <Card key={lead.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="line-clamp-2">{lead.name}</CardTitle>
                                <Badge variant={
                                    lead.status === 'Active' ? 'success' :
                                    lead.status === 'Completed' ? 'secondary' : 'outline'
                                }>{lead.status}</Badge>
                            </div>
                            <CardDescription>{lead.startDate} to {lead.endDate}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                            <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">{lead.description || "No description provided."}</p>
                             <div className="flex justify-between text-sm text-muted-foreground pt-2">
                                <Badge variant="outline">{lead.authenticityStatus}</Badge>
                                <Badge variant="outline">{lead.publicVisibility}</Badge>
                            </div>
                            <Button asChild className="mt-4 w-full">
                                <Link href={`/leads-public/${lead.id}/summary`}>
                                    View Details
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
        
         {!isLoading && filteredLeads.length === 0 && (
            <div className="text-center py-16">
                <p className="text-muted-foreground">No public leads found matching your criteria.</p>
            </div>
        )}
      </main>
    </div>
  );
}
