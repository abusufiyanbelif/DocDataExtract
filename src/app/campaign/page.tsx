'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, ShieldAlert, MoreHorizontal, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useStorage, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Campaign, Beneficiary, Donation } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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


type SortKey = keyof Campaign | 'srNo';

export default function CampaignPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const campaignsCollectionRef = useMemo(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'campaigns');
  }, [firestore, userProfile]);

  const { data: campaigns, isLoading: areCampaignsLoading } = useCollection<Campaign>(campaignsCollectionRef);

  const handleRowClick = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/summary`);
  };
  
  const handleDeleteClick = (campaign: Campaign) => {
    if (!canDelete) return;
    setCampaignToDelete(campaign);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete || !firestore || !storage || !canDelete) {
        toast({ title: 'Error', description: 'Could not delete campaign.', variant: 'destructive'});
        return;
    };

    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    toast({ title: 'Deleting...', description: `Please wait while '${campaignToDelete.name}' and all its data are being deleted.`});

    try {
        const campaignId = campaignToDelete.id;

        // --- Fetch all associated documents and file URLs ---
        const beneficiariesRef = collection(firestore, `campaigns/${campaignId}/beneficiaries`);
        const beneficiariesSnap = await getDocs(beneficiariesRef);

        const donationsQuery = query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
        const donationsSnap = await getDocs(donationsQuery);
        
        const storageUrls: string[] = [];
        beneficiariesSnap.forEach(doc => {
            const data = doc.data() as Beneficiary;
            if (data.idProofUrl) storageUrls.push(data.idProofUrl);
        });
        donationsSnap.forEach(doc => {
            const data = doc.data() as Donation;
            if (data.screenshotUrl) storageUrls.push(data.screenshotUrl);
        });

        // --- Step 1: Delete files from Storage ---
        const deleteFilePromises = storageUrls.map(url => {
            const fileRef = storageRef(storage, url);
            return deleteObject(fileRef).catch(error => {
                // Don't throw an error, just continue
                if (error.code !== 'storage/object-not-found') {
                    console.error(`Failed to delete file ${url}`, error);
                }
            });
        });

        await Promise.all(deleteFilePromises);
        
        // --- Step 2: Delete documents from Firestore ---
        const batch = writeBatch(firestore);
        beneficiariesSnap.forEach(doc => batch.delete(doc.ref));
        donationsSnap.forEach(doc => batch.delete(doc.ref));
        batch.delete(doc(firestore, 'campaigns', campaignId));

        await batch.commit();
        
        toast({ title: 'Success', description: `Campaign '${campaignToDelete.name}' was successfully deleted.`, variant: 'success' });

    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `campaigns/${campaignToDelete.id} and all sub-collections`, operation: 'delete' }));
    } finally {
        setIsDeleting(false);
        setCampaignToDelete(null);
    }
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
            if (sortConfig.key === 'srNo') return 0;
            const aValue = a[sortConfig.key] ?? '';
            const bValue = b[sortConfig.key] ?? '';
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
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
  const canViewCampaigns = userProfile?.role === 'Admin' || !!campaignPerms?.read || canReadAnySubmodule;
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.create;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.delete;
  
  const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-2">
                {children}
                {isSorted && (sortConfig?.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
            </div>
        </TableHead>
    );
  };
  
  if (!isLoading && !canViewCampaigns) {
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
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {isLoading && <Skeleton className="h-10 w-44" />}
            {!isLoading && canCreate && (
              <Button asChild>
                <Link href="/campaign/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                  <SortableHeader sortKey="srNo">#</SortableHeader>
                  <SortableHeader sortKey="name">Campaign Name</SortableHeader>
                  <SortableHeader sortKey="category">Category</SortableHeader>
                  <SortableHeader sortKey="startDate">Start Date</SortableHeader>
                  <SortableHeader sortKey="endDate">End Date</SortableHeader>
                  <SortableHeader sortKey="status">Status</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={canDelete ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && filteredAndSortedCampaigns.map((campaign, index) => (
                  <TableRow key={campaign.id} className="group">
                    {canDelete && (
                      <TableCell className="text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {canDelete && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(campaign); }} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                      </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    )}
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">{index + 1}</TableCell>
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="font-medium cursor-pointer">{campaign.name}</TableCell>
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">{campaign.category}</TableCell>
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">{campaign.startDate}</TableCell>
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">{campaign.endDate}</TableCell>
                    <TableCell onClick={() => handleRowClick(campaign.id)} className="cursor-pointer">{campaign.status}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredAndSortedCampaigns.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={canDelete ? 7 : 6} className="text-center text-muted-foreground h-24">
                           No campaigns found matching your criteria. {canCreate && campaigns?.length === 0 && <Link href="/campaign/create" className="text-primary underline">Create one now</Link>}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
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

    </div>
  );
}
