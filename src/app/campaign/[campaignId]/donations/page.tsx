'use client';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useStorage, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, setDoc } from 'firebase/firestore';
import type { Donation, Campaign } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, Eye } from 'lucide-react';
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DonationForm, type DonationFormData } from '@/components/donation-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function DonationsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const campaignDocRef = useMemo(() => {
    if (!firestore || !campaignId || isProfileLoading) return null;
    return doc(firestore, 'campaigns', campaignId);
  }, [firestore, campaignId, isProfileLoading]);
  const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
  
  const donationsCollectionRef = useMemo(() => {
    if (!firestore || !campaignId || isProfileLoading) return null;
    return query(collection(firestore, 'donations'), where('campaignId', '==', campaignId));
  }, [firestore, campaignId, isProfileLoading]);
  const { data: donations, isLoading: areDonationsLoading } = useCollection<Donation>(donationsCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  
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
    setIsImageViewerOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!donationToDelete || !firestore || !storage || !canDelete) return;

    const donationData = donations.find(d => d.id === donationToDelete);
    const docRef = doc(firestore, 'donations', donationToDelete);
    
    toast({ title: 'Deleting...', description: 'Please wait while the donation is being deleted.'});

    const deleteFilePromise = donationData?.screenshotUrl
        ? deleteObject(storageRef(storage, donationData.screenshotUrl))
        : Promise.resolve();

    deleteFilePromise.catch(error => {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Could not delete associated file from storage:", error);
            toast({
                title: "File Deletion Warning",
                description: "Could not remove the associated screenshot file. It may need to be removed manually.",
                variant: 'destructive',
                duration: 7000
            });
        }
    });
        
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Success', description: 'Donation deleted.', variant: 'default' });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });

    setDonationToDelete(null);
    setIsDeleteDialogOpen(false);
  };
  
  const handleFormSubmit = async (data: DonationFormData) => {
    if (!firestore || !storage || !campaignId || !campaign || !userProfile) return;
    
    if (editingDonation && !canUpdate) return;
    if (!editingDonation && !canCreate) return;

    if (!editingDonation && data.donorPhone && data.donorName) {
        const isDuplicate = donations.some(d => 
            d.donorName.toLowerCase() === data.donorName.toLowerCase() && 
            d.donorPhone === data.donorPhone &&
            d.campaignId === campaignId
        );
        if (isDuplicate) {
            toast({
                title: 'Duplicate Entry',
                description: 'A donation with the same name and phone number already exists for this campaign.',
                variant: 'destructive',
            });
            return;
        }
    }

    const docRef = editingDonation
        ? doc(firestore, 'donations', editingDonation.id)
        : doc(collection(firestore, 'donations'));

    let screenshotUrl = editingDonation?.screenshotUrl || '';
    
    try {
        const fileList = data.screenshotFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            toast({
                title: "Uploading Screenshot...",
                description: `Please wait while '${file.name}' is uploaded.`,
            });
            
            const fileNameParts = [ data.donorName, data.donorPhone, data.donationDate, 'referby', userProfile.name ];
            const sanitizedBaseName = fileNameParts.join('_').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_{2,}/g, '_');
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const finalFileName = `${docRef.id}_${sanitizedBaseName}.${fileExtension}`;
            const filePath = `campaigns/${campaignId}/donations/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, file);
            screenshotUrl = await getDownloadURL(uploadResult.ref);
        }

        const { screenshotFile, ...donationData } = data;
        
        const finalData = {
            ...donationData,
            screenshotUrl,
            campaignId: campaignId,
            campaignName: campaign.name,
            uploadedBy: userProfile.name,
            uploadedById: userProfile.id,
            ...(!editingDonation && { createdAt: serverTimestamp() }),
        };

        setDoc(docRef, finalData, { merge: true })
            .then(() => {
                toast({ title: 'Success', description: `Donation ${editingDonation ? 'updated' : 'added'}.`, variant: 'default' });
            })
            .catch(async (serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: editingDonation ? 'update' : 'create',
                    requestResourceData: finalData
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });

    } catch (error) {
        console.error("Error during file upload:", error);
        toast({ title: 'Error', description: 'Could not save donation screenshot.', variant: 'destructive' });
    } finally {
        setIsFormOpen(false);
        setEditingDonation(null);
    }
  };
  
  const totalDonationAmount = useMemo(() => {
    return donations.reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [donations]);

  const isLoading = isCampaignLoading || areDonationsLoading || isProfileLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
            <Button variant="outline" asChild>
                <Link href="/campaign">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Campaigns
                </Link>
            </Button>
        </div>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">{campaign?.name}</h1>
        </div>
        
        <div className="flex flex-wrap gap-2 border-b mb-4">
             {canReadSummary && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
              </Button>
            )}
            {canReadRation && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}`}>{campaign?.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
              </Button>
            )}
            {canReadBeneficiaries && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
              </Button>
            )}
            {canReadDonations && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                  <Link href={`/campaign/${campaignId}/donations`}>Donations</Link>
              </Button>
            )}
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <CardTitle>Donation List ({donations.length})</CardTitle>
              <p className="text-muted-foreground">
                  Total Donations: <span className="font-bold text-foreground">₹{totalDonationAmount.toFixed(2)}</span>
              </p>
            </div>
            {canCreate && (
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Donation
                </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          {(canUpdate || canDelete) && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                          <TableHead>Donor Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Referral</TableHead>
                          <TableHead className="text-right">Amount (₹)</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Screenshot</TableHead>
                          <TableHead>Uploaded By</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {areDonationsLoading ? (
                        [...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell colSpan={(canUpdate || canDelete) ? 11 : 10}><Skeleton className="h-6 w-full" /></TableCell>
                           </TableRow>
                        ))
                      ) : donations.length > 0 ? (
                        donations.map((donation) => (
                          <TableRow key={donation.id}>
                              {(canUpdate || canDelete) && (
                                <TableCell className="text-center">
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
                              <TableCell className="font-medium">{donation.donorName}</TableCell>
                              <TableCell>{donation.donorPhone}</TableCell>
                              <TableCell>{donation.referral}</TableCell>
                              <TableCell className="text-right font-medium">₹{donation.amount.toFixed(2)}</TableCell>
                              <TableCell><Badge variant="secondary">{donation.type}</Badge></TableCell>
                              <TableCell><Badge variant="outline">{donation.paymentType}</Badge></TableCell>
                              <TableCell>{donation.donationDate}</TableCell>
                              <TableCell>
                                  <Badge variant={donation.status === 'Verified' ? 'default' : donation.status === 'Canceled' ? 'destructive' : 'outline'}>{donation.status}</Badge>
                              </TableCell>
                              <TableCell>
                                  {donation.screenshotUrl ? (
                                    <Button variant="outline" size="sm" onClick={() => handleViewImage(donation.screenshotUrl)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                  ) : "N/A"}
                              </TableCell>
                              <TableCell>{donation.uploadedBy}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                            <TableCell colSpan={(canUpdate || canDelete) ? 11 : 10} className="text-center h-24 text-muted-foreground">
                                No donations recorded yet.
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
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
                <div className="relative h-[70vh] w-full mt-4">
                    <Image src={imageToView} alt="Donation screenshot" fill className="object-contain" />
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
