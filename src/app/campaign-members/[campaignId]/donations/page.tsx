'use client';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useStorage, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, setDoc, DocumentReference } from 'firebase/firestore';
import type { Donation, Campaign } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, Eye, ArrowUp, ArrowDown, RefreshCw, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DonationForm, type DonationFormData } from '@/components/donation-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

type SortKey = keyof Donation | 'srNo';

export default function DonationsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const campaignDocRef = useMemo(() => {
    if (!firestore || !campaignId) return null;
    return doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign>;
  }, [firestore, campaignId]);
  const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
  
  const donationsCollectionRef = useMemo(() => {
    if (!firestore || !campaignId) return null;
    return query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
  }, [firestore, campaignId]);
  const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<string | null>(null);
  
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [donationTypeFilter, setDonationTypeFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'donationDate', direction: 'descending'});
  
  const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
  const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
  const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
  const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;

  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.create;
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.update;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.delete;

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingDonation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (donation: Donation) => {
    if (!canUpdate) return;
    setEditingDonation(donation);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (!canDelete) return;
    setDonationToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewImage = (url: string) => {
    setImageToView(url);
    setZoom(1);
    setRotation(0);
    setIsImageViewerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!donationToDelete || !firestore || !storage || !canDelete) return;

    const donationData = donations.find(d => d.id === donationToDelete);
    if (!donationData) return;

    const docRef = doc(firestore, 'donations', donationToDelete);
    const screenshotUrl = donationData.screenshotUrl;
    
    setIsDeleteDialogOpen(false);
    toast({ title: 'Deleting...', description: 'Please wait while the donation is being deleted.'});

    const deleteDocument = () => {
        deleteDoc(docRef)
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                toast({ title: 'Success', description: 'Donation deleted successfully.', variant: 'success' });
                setDonationToDelete(null);
            });
    };

    if (screenshotUrl) {
        await deleteObject(storageRef(storage, screenshotUrl))
            .catch(err => console.warn("Failed to delete screenshot from storage:", err));
    }
    
    deleteDocument();
  };
  
  const handleFormSubmit = async (data: DonationFormData) => {
    if (!firestore || !storage || !campaignId || !campaign || !userProfile) return;
    
    if (editingDonation && !canUpdate) return;
    if (!editingDonation && !canCreate) return;

    if (data.isTransactionIdRequired && data.transactionId && !editingDonation) {
        const isDuplicate = donations.some(d => d.transactionId === data.transactionId && d.campaignId === campaignId);
        if (isDuplicate) {
            toast({
                title: 'Duplicate Transaction ID',
                description: 'A donation with this transaction ID already exists in this campaign.',
                variant: 'destructive',
            });
            return;
        }
    }

    setIsFormOpen(false);
    setEditingDonation(null);
    toast({ title: "Saving...", description: `Please wait while the donation is being ${editingDonation ? 'updated' : 'added'}.`});

    const docRef = editingDonation
        ? doc(firestore, 'donations', editingDonation.id)
        : doc(collection(firestore, 'donations'));
    
    let finalData: any;

    try {
        let screenshotUrl = editingDonation?.screenshotUrl || '';
    
        if (data.screenshotDeleted && screenshotUrl) {
            await deleteObject(storageRef(storage, screenshotUrl));
            screenshotUrl = '';
        }
        
        const fileList = data.screenshotFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            if (screenshotUrl) {
                 await deleteObject(storageRef(storage, screenshotUrl)).catch(err => {
                    if (err.code !== 'storage/object-not-found') {
                        console.warn("Failed to delete old screenshot during replacement:", err);
                    }
                });
            }
            const file = fileList[0];
            
            const { default: Resizer } = await import('react-image-file-resizer');
            const resizedBlob = await new Promise<Blob>((resolve) => {
                 Resizer.imageFileResizer(
                    file, 1024, 1024, 'JPEG', 80, 0,
                    blob => {
                        resolve(blob as Blob);
                    }, 'blob'
                );
            });
            
            const campaignCreatedDate = campaign.createdAt?.toDate ? campaign.createdAt.toDate().toISOString().split('T')[0] : (campaign.startDate || 'nodate');
            const campaignFolderName = `${campaign.name.replace(/[\s/]/g, '_')}_${campaignCreatedDate}`;

            const transactionIdPart = data.transactionId || 'NULL';
            const fileNameParts = [ data.donorName, data.donorPhone, data.donationDate, transactionIdPart, 'referby', userProfile.name ];
            const sanitizedBaseName = fileNameParts.join('_').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_{2,}/g, '_');
            const fileExtension = 'jpeg';
            const finalFileName = `${docRef.id}_${sanitizedBaseName}.${fileExtension}`;
            const filePath = `campaigns/${campaignFolderName}/donations/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, resizedBlob);
            screenshotUrl = await getDownloadURL(uploadResult.ref);
        }

        const { screenshotFile, screenshotDeleted, isTransactionIdRequired, ...donationData } = data;
        
        finalData = {
            ...donationData,
            screenshotUrl,
            campaignId: campaignId,
            campaignName: campaign.name,
            uploadedBy: userProfile.name,
            uploadedById: userProfile.id,
            ...(!editingDonation && { createdAt: serverTimestamp() }),
        };

        await setDoc(docRef, finalData, { merge: true });

        toast({ title: 'Success', description: `Donation ${editingDonation ? 'updated' : 'added'}.`, variant: 'success' });

    } catch (error: any) {
        console.warn("Error during form submission:", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: editingDonation ? 'update' : 'create',
                requestResourceData: finalData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ title: 'Save Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
        }
    }
  };
  
  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedDonations = useMemo(() => {
    if (!donations) return [];
    let sortableItems = [...donations];

    // Filtering logic
    if (statusFilter !== 'All') {
        sortableItems = sortableItems.filter(d => d.status === statusFilter);
    }
    if (typeFilter !== 'All') {
        sortableItems = sortableItems.filter(d => d.type === typeFilter);
    }
    if (donationTypeFilter !== 'All') {
        sortableItems = sortableItems.filter(d => d.donationType === donationTypeFilter);
    }
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      sortableItems = sortableItems.filter(d => 
        (d.donorName || '').toLowerCase().includes(lowercasedTerm) ||
        (d.receiverName || '').toLowerCase().includes(lowercasedTerm) ||
        (d.donorPhone || '').toLowerCase().includes(lowercasedTerm) ||
        (d.referral || '').toLowerCase().includes(lowercasedTerm) ||
        (d.transactionId || '').toLowerCase().includes(lowercasedTerm)
      );
    }

    // Sorting
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'srNo') return 0;
            const aValue = a[sortConfig.key] ?? '';
            const bValue = b[sortConfig.key] ?? '';
            
            if (sortConfig.key === 'amount') {
                 return sortConfig.direction === 'ascending' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
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
  }, [donations, searchTerm, statusFilter, typeFilter, donationTypeFilter, sortConfig]);

  const totalDonationAmount = useMemo(() => {
    if (!filteredAndSortedDonations) return 0;
    return filteredAndSortedDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [filteredAndSortedDonations]);

  const isLoading = isCampaignLoading || areDonationsLoading || isProfileLoading;
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortKey, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-2">
                {children}
                {isSorted && (sortConfig?.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
            </div>
        </TableHead>
    );
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
            <Button variant="outline" asChild>
                <Link href="/campaign-members">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Campaigns
                </Link>
            </Button>
        </div>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">{campaign?.name}</h1>
        </div>
        
        <div className="border-b mb-4">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4">
                     {canReadSummary && (
                      <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                          <Link href={`/campaign-members/${campaignId}/summary`}>Summary</Link>
                      </Button>
                    )}
                    {canReadRation && (
                      <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                          <Link href={`/campaign-members/${campaignId}`}>{campaign?.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
                      </Button>
                    )}
                    {canReadBeneficiaries && (
                      <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none">
                          <Link href={`/campaign-members/${campaignId}/beneficiaries`}>Beneficiary List</Link>
                      </Button>
                    )}
                    {canReadDonations && (
                      <Button variant="ghost" asChild className="shrink-0 rounded-b-none border-b-2 border-transparent pb-3 pt-2 data-[active=true]:border-primary data-[active=true]:text-primary data-[active=true]:shadow-none" data-active="true">
                          <Link href={`/campaign-members/${campaignId}/donations`}>Donations</Link>
                      </Button>
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <CardTitle>Donation List ({filteredAndSortedDonations.length})</CardTitle>
                <p className="text-muted-foreground">
                    Total Donations for filtered results: <span className="font-bold text-foreground">Rupee {totalDonationAmount.toFixed(2)}</span>
                </p>
              </div>
              {canCreate && (
                  <Button onClick={handleAdd}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Donation
                  </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
                <Input
                    placeholder="Search donor, receiver, phone, etc."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Verified">Verified</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Canceled">Canceled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        <SelectItem value="Zakat">Zakat</SelectItem>
                        <SelectItem value="Sadqa">Sadqa</SelectItem>
                        <SelectItem value="Interest">Interest</SelectItem>
                        <SelectItem value="Lillah">Lillah</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={donationTypeFilter} onValueChange={setDonationTypeFilter}>
                     <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by donation type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Donation Types</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Online Payment">Online Payment</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {(canUpdate || canDelete) && <TableHead className="w-[100px] text-center sticky left-0 bg-card z-10">Actions</TableHead>}
                            <SortableHeader sortKey="srNo">#</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <SortableHeader sortKey="donorName">Donor Name</SortableHeader>
                            <SortableHeader sortKey="receiverName">Receiver Name</SortableHeader>
                            <SortableHeader sortKey="donorPhone">Phone</SortableHeader>
                            <SortableHeader sortKey="referral">Referral</SortableHeader>
                            <SortableHeader sortKey="amount" className="text-right">Amount (Rupee)</SortableHeader>
                            <SortableHeader sortKey="type">Category</SortableHeader>
                            <SortableHeader sortKey="donationType">Donation Type</SortableHeader>
                            <SortableHeader sortKey="transactionId">Transaction ID</SortableHeader>
                            <SortableHeader sortKey="donationDate">Date</SortableHeader>
                            <TableHead>Screenshot</TableHead>
                            <SortableHeader sortKey="uploadedBy">Uploaded By</SortableHeader>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {areDonationsLoading ? (
                        [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={(canUpdate || canDelete) ? 14 : 13}><Skeleton className="h-6 w-full" /></TableCell>
                            </TableRow>
                        ))
                        ) : (filteredAndSortedDonations && filteredAndSortedDonations.length > 0) ? (
                        filteredAndSortedDonations.map((donation, index) => (
                            <TableRow key={donation.id}>
                                {(canUpdate || canDelete) && (
                                <TableCell className="text-center sticky left-0 bg-card z-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {canUpdate && (
                                                <DropdownMenuItem onClick={() => handleEdit(donation)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            )}
                                            {canDelete && (
                                                <DropdownMenuItem onClick={() => handleDeleteClick(donation.id)} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                )}
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <Badge variant={donation.status === 'Verified' ? 'success' : donation.status === 'Canceled' ? 'destructive' : 'outline'}>{donation.status}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{donation.donorName}</TableCell>
                                <TableCell>{donation.receiverName}</TableCell>
                                <TableCell>{donation.donorPhone}</TableCell>
                                <TableCell>{donation.referral}</TableCell>
                                <TableCell className="text-right font-medium">Rupee {donation.amount.toFixed(2)}</TableCell>
                                <TableCell><Badge variant="secondary">{donation.type}</Badge></TableCell>
                                <TableCell><Badge variant="outline">{donation.donationType}</Badge></TableCell>
                                <TableCell>{donation.transactionId || 'N/A'}</TableCell>
                                <TableCell>{donation.donationDate}</TableCell>
                                <TableCell>
                                    {donation.screenshotUrl && donation.screenshotIsPublic && (
                                    <Button variant="outline" size="sm" onClick={() => donation.screenshotUrl && handleViewImage(donation.screenshotUrl)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                    )}
                                     {donation.screenshotUrl && !donation.screenshotIsPublic && "Private"}
                                     {!donation.screenshotUrl && "N/A"}
                                </TableCell>
                                <TableCell>{donation.uploadedBy}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={(canUpdate || canDelete) ? 14 : 13} className="text-center h-24 text-muted-foreground">
                                No donations found matching your criteria.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingDonation ? 'Edit' : 'Add'} Donation</DialogTitle>
            </DialogHeader>
            <DonationForm
                donation={editingDonation}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the donation record and its associated screenshot from storage.
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

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Donation Screenshot</DialogTitle>
            </DialogHeader>
            {imageToView && (
                <div className="relative h-[70vh] w-full mt-4 overflow-hidden bg-secondary/20">
                    <div
                        className="absolute inset-0 transition-transform duration-200 ease-out"
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    >
                        <Image src={imageToView} alt="Donation screenshot" fill className="object-contain" />
                    </div>
                </div>
            )}
             <DialogFooter className="sm:justify-center pt-4">
                <Button variant="outline" onClick={() => setZoom(z => z * 1.2)}><ZoomIn className="mr-2"/> Zoom In</Button>
                <Button variant="outline" onClick={() => setZoom(z => z / 1.2)}><ZoomOut className="mr-2"/> Zoom Out</Button>
                <Button variant="outline" onClick={() => setRotation(r => r + 90)}><RotateCw className="mr-2"/> Rotate</Button>
                <Button variant="outline" onClick={() => { setZoom(1); setRotation(0); }}><RefreshCw className="mr-2"/> Reset</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
