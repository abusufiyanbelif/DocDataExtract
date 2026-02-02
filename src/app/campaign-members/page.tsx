
'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, ShieldAlert, MoreHorizontal, Trash2, Edit, Copy } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import type { Campaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CopyCampaignDialog } from '@/components/copy-campaign-dialog';
import { copyCampaignAction, deleteCampaignAction } from './actions';


type SortKey = keyof Campaign | 'srNo';

export default function CampaignPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [campaignToCopy, setCampaignToCopy] = useState<Campaign | null>(null);
  
  const { userProfile, isLoading: isProfileLoading } = useSession();

  const campaignsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'campaigns');
  }, [firestore]);

  const { data: campaigns, isLoading: areCampaignsLoading } = useCollection<Campaign>(campaignsCollectionRef);

  const handleDeleteClick = (campaign: Campaign) => {
    if (!canDelete) return;
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleCopyClick = (campaign: Campaign) => {
    if (!canCreate) return;
    setCampaignToCopy(campaign);
    setIsCopyDialogOpen(true);
  };

  const handleCopyConfirm = async (options: { newName: string; copyBeneficiaries: boolean; copyDonations: boolean; copyRationLists: boolean; }) => {
    if (!campaignToCopy || !canCreate) return;

    setIsCopyDialogOpen(false);
    toast({ title: 'Copying campaign...', description: `Please wait while '${campaignToCopy.name}' is being copied.`});
    
    const result = await copyCampaignAction({
        sourceCampaignId: campaignToCopy.id,
        ...options
    });

    if (result.success) {
        toast({ title: 'Campaign Copied', description: result.message, variant: 'success' });
        router.refresh();
    } else {
        toast({ title: 'Copy Failed', description: result.message, variant: 'destructive' });
    }

    setCampaignToCopy(null);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete || !canDelete) {
        toast({ title: 'Error', description: 'Could not delete campaign.', variant: 'destructive'});
        return;
    };

    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    toast({ title: 'Deleting...', description: `Please wait while '${campaignToDelete.name}' and all its data are being deleted.`});

    const result = await deleteCampaignAction(campaignToDelete.id);

    if (result.success) {
        toast({ title: 'Success', description: result.message, variant: 'success' });
        router.refresh();
    } else {
        toast({ title: 'Deletion Failed', description: result.message, variant: 'destructive' });
    }
    
    setIsDeleting(false);
    setCampaignToDelete(null);
  };


  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    let sortableItems = [...campaigns];
    
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

    // Sorting
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'srNo') return 0; // srNo is just index, no real sorting
            const aValue = a[sortConfig.key] ?? '';
            const bValue = b[sortConfig.key] ?? '';
            
            if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
                return sortConfig.direction === 'ascending' ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime() : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 if (aValue.toLowerCase() < bValue.toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue.toLowerCase() > bValue.toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
            }
            return 0;
        });
    }
    return sortableItems;
  }, [campaigns, searchTerm, statusFilter, categoryFilter, sortConfig]);

  const isLoading = areCampaignsLoading || isProfileLoading || isDeleting;
  
  const campaignPerms = userProfile?.permissions?.campaigns;
  const canReadAnySubmodule = 
    !!campaignPerms?.summary?.read ||
    !!campaignPerms?.ration?.read ||
    !!campaignPerms?.beneficiaries?.read ||
    !!campaignPerms?.donations?.read;
  const canViewCampaigns = userProfile?.role === 'Admin' || !!campaignPerms?.create || !!campaignPerms?.update || !!campaignPerms?.delete || canReadAnySubmodule;
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.create;
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.update;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.delete;
  
  
  if (!isLoading && userProfile && !canViewCampaigns) {
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
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                    You do not have the required permissions to view campaigns.
                    </AlertDescription>
                </Alert>
            </main>
        </div>
    )
  }

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
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="flex-1 space-y-2">
                <CardTitle>Campaigns</CardTitle>
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
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {isLoading && <Skeleton className="h-10 w-44" />}
            {!isLoading && canCreate && (
              <Button asChild>
                <Link href="/campaign-members/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && (
                    [...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
                )}
                {!isLoading && filteredAndSortedCampaigns.map((campaign) => (
                    <Card key={campaign.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="truncate flex-1">{campaign.name}</CardTitle>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {canUpdate && (
                                            <DropdownMenuItem
                                                onClick={() => router.push(`/campaign-members/${campaign.id}/summary`)}
                                                className="cursor-pointer"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {canCreate && (
                                            <DropdownMenuItem
                                                onClick={() => handleCopyClick(campaign)}
                                                className="cursor-pointer"
                                            >
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy
                                            </DropdownMenuItem>
                                        )}
                                        {(canUpdate || canCreate) && canDelete && <DropdownMenuSeparator />}
                                        {canDelete && (
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(campaign); }}
                                                className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardDescription>{campaign.startDate} to {campaign.endDate}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="flex justify-between text-sm text-muted-foreground">
                                <Badge variant="outline">{campaign.category}</Badge>
                                <Badge variant={
                                    campaign.status === 'Active' ? 'success' :
                                    campaign.status === 'Completed' ? 'secondary' : 'outline'
                                }>{campaign.status}</Badge>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/campaign-members/${campaign.id}/summary`}>
                                    View Details
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
             {!isLoading && filteredAndSortedCampaigns.length === 0 && (
                 <div className="text-center py-16">
                    <p className="text-muted-foreground">No campaigns found matching your criteria.</p>
                    {canCreate && campaigns?.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            <Link href="/campaign-members/create" className="text-primary underline">
                                Create one now
                            </Link>
                        </p>
                    )}
                </div>
            )}
          </CardContent>
        </Card>
      </main>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the campaign '{campaignToDelete?.name}' and all of its associated data, including beneficiaries, donations, and uploaded files.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDeleteConfirm} 
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <CopyCampaignDialog
            open={isCopyDialogOpen}
            onOpenChange={setIsCopyDialogOpen}
            campaign={campaignToCopy}
            onCopyConfirm={handleCopyConfirm}
        />

    </div>
  );
}
