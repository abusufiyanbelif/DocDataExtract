'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { Beneficiary, Campaign } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, Upload, Download } from 'lucide-react';
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
import { BeneficiaryForm, type BeneficiaryFormData } from '@/components/beneficiary-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

export default function BeneficiariesPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const campaignDocRef = useMemo(() => {
    if (!firestore || !campaignId) return null;
    return doc(firestore, 'campaigns', campaignId);
  }, [firestore, campaignId]);
  const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
  
  const beneficiariesCollectionRef = useMemo(() => {
    if (!firestore || !campaignId) return null;
    return collection(firestore, `campaigns/${campaignId}/beneficiaries`);
  }, [firestore, campaignId]);
  const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<string | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const isAdmin = userProfile?.role === 'Admin';

  const handleAdd = () => {
    if (!isAdmin) return;
    setEditingBeneficiary(null);
    setIsFormOpen(true);
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    if (!isAdmin) return;
    setEditingBeneficiary(beneficiary);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (!isAdmin) return;
    setBeneficiaryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (beneficiaryToDelete && firestore && campaignId && isAdmin) {
        const docRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, beneficiaryToDelete);
        try {
            await deleteDoc(docRef);
            toast({ title: 'Success', description: 'Beneficiary deleted.' });
        } catch (error) {
            console.error("Error deleting beneficiary:", error);
            toast({ title: 'Error', description: 'Could not delete beneficiary.', variant: 'destructive' });
        } finally {
            setBeneficiaryToDelete(null);
            setIsDeleteDialogOpen(false);
        }
    }
  };
  
  const handleFormSubmit = async (data: BeneficiaryFormData) => {
    if (!firestore || !campaignId || !isAdmin) return;

    try {
        if (editingBeneficiary) {
            const docRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, editingBeneficiary.id);
            await updateDoc(docRef, data);
            toast({ title: 'Success', description: 'Beneficiary updated.' });
        } else {
            const collectionRef = collection(firestore, `campaigns/${campaignId}/beneficiaries`);
            await addDoc(collectionRef, {
                ...data,
                addedDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Beneficiary added.' });
        }
    } catch (error) {
        console.error("Error saving beneficiary:", error);
        toast({ title: 'Error', description: 'Could not save beneficiary.', variant: 'destructive' });
    } finally {
        setIsFormOpen(false);
        setEditingBeneficiary(null);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
        'name', 'address', 'phone', 'members', 'earningMembers', 'male', 'female',
        'idProofType', 'idNumber', 'referralBy', 'kitAmount', 'status'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Beneficiaries');
    XLSX.writeFile(wb, 'beneficiary_import_template.xlsx');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        setSelectedFile(event.target.files[0]);
    }
  };

  const handleImportBeneficiaries = async () => {
    if (!selectedFile || !firestore || !campaignId || !isAdmin) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) throw new Error("The file is empty.");

            const requiredHeaders = ['name', 'address', 'phone', 'members', 'kitAmount', 'status'];
            const actualHeaders = Object.keys(json[0]);
            if (!requiredHeaders.every(h => actualHeaders.includes(h))) {
                 throw new Error(`File is missing required headers. Required: ${requiredHeaders.join(', ')}`);
            }
            
            const batch = writeBatch(firestore);
            const beneficiariesRef = collection(firestore, `campaigns/${campaignId}/beneficiaries`);

            json.forEach(row => {
                const docRef = doc(beneficiariesRef);
                const beneficiaryData: Omit<Beneficiary, 'id'> = {
                    name: String(row.name || '').trim(),
                    address: String(row.address || '').trim(),
                    phone: String(row.phone || '').trim(),
                    members: Number(row.members || 0),
                    earningMembers: Number(row.earningMembers || 0),
                    male: Number(row.male || 0),
                    female: Number(row.female || 0),
                    idProofType: String(row.idProofType || '').trim(),
                    idNumber: String(row.idNumber || '').trim(),
                    referralBy: String(row.referralBy || '').trim(),
                    kitAmount: Number(row.kitAmount || 0),
                    status: (row.status || 'Pending').trim(),
                    addedDate: new Date().toISOString().split('T')[0],
                    createdAt: serverTimestamp(),
                };
                
                if (!beneficiaryData.name || !beneficiaryData.address) {
                    console.warn("Skipping row with missing name or address:", row);
                    return;
                }

                batch.set(docRef, beneficiaryData);
            });

            await batch.commit();
            toast({ title: 'Success', description: `${json.length} beneficiaries imported successfully.` });

        } catch (error: any) {
            toast({ title: 'Import Failed', description: error.message || "An error occurred during import.", variant: 'destructive' });
        } finally {
            setIsImporting(false);
            setIsImportOpen(false);
            setSelectedFile(null);
        }
    };
    reader.onerror = (error) => {
        toast({ title: 'File Error', description: 'Could not read the file.', variant: 'destructive'});
        setIsImporting(false);
    }
    reader.readAsArrayBuffer(selectedFile);
  };

  const totalKitAmount = useMemo(() => {
    return beneficiaries.reduce((acc, b) => acc + (b.kitAmount || 0), 0);
  }, [beneficiaries]);

  const isLoading = isCampaignLoading || areBeneficiariesLoading || isProfileLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!campaign) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8 text-center">
                <p className="text-lg text-muted-foreground">Campaign not found.</p>
                <Button asChild className="mt-4">
                    <Link href="/campaign">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Campaigns
                    </Link>
                </Button>
            </main>
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
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
        </div>
        
        <div className="flex gap-2 border-b mb-4">
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
            </Button>
             <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}/donations`}>Donations</Link>
            </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Beneficiary List</CardTitle>
            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Beneficiaries
                    </Button>
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Beneficiary
                    </Button>
                </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          {isAdmin && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                          <TableHead className="w-[40px]">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-center">Members</TableHead>
                          <TableHead className="text-center">Earning</TableHead>
                          <TableHead className="text-center">M/F</TableHead>
                          <TableHead>Added Date</TableHead>
                          <TableHead>ID Proof Type</TableHead>
                          <TableHead>ID Number</TableHead>
                          <TableHead>Referred By</TableHead>
                          <TableHead className="text-right">Kit Amount (₹)</TableHead>
                          <TableHead>Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {areBeneficiariesLoading && (
                        [...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell colSpan={isAdmin ? 14 : 13}><Skeleton className="h-6 w-full" /></TableCell>
                           </TableRow>
                        ))
                      )}
                      {!areBeneficiariesLoading && beneficiaries.map((beneficiary, index) => (
                          <TableRow key={beneficiary.id}>
                              {isAdmin && (
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(beneficiary)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteClick(beneficiary.id)} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                              )}
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{beneficiary.name}</TableCell>
                              <TableCell>{beneficiary.address}</TableCell>
                              <TableCell>{beneficiary.phone}</TableCell>
                              <TableCell className="text-center">{beneficiary.members}</TableCell>
                              <TableCell className="text-center">{beneficiary.earningMembers}</TableCell>
                              <TableCell className="text-center">{beneficiary.male}/{beneficiary.female}</TableCell>
                              <TableCell>{beneficiary.addedDate}</TableCell>
                              <TableCell>{beneficiary.idProofType}</TableCell>
                              <TableCell>{beneficiary.idNumber}</TableCell>
                              <TableCell>{beneficiary.referralBy}</TableCell>
                              <TableCell className="text-right font-medium">₹{beneficiary.kitAmount.toFixed(2)}</TableCell>
                              <TableCell>
                                  <Badge variant={
                                      beneficiary.status === 'Given' ? 'default' :
                                      beneficiary.status === 'Pending' ? 'secondary' :
                                      beneficiary.status === 'Hold' ? 'destructive' : 'outline'
                                  }>{beneficiary.status}</Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                      {!areBeneficiariesLoading && beneficiaries.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={isAdmin ? 14 : 13} className="text-center h-24 text-muted-foreground">
                                No beneficiaries added yet.
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 12 : 11} className="text-right font-bold">Total Kit Amount Required</TableCell>
                        <TableCell className="text-right font-bold">₹{totalKitAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>{editingBeneficiary ? 'Edit' : 'Add'} Beneficiary</DialogTitle>
            </DialogHeader>
            <BeneficiaryForm
                beneficiary={editingBeneficiary}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                rationLists={campaign.rationLists}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the beneficiary record.
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

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Beneficiaries</DialogTitle>
                <DialogDescription>
                    Upload an Excel (.xlsx) file with beneficiary data. Make sure it follows the provided template format.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx, .csv"
                    onChange={handleFileSelect}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setIsImportOpen(false); setSelectedFile(null); }}>Cancel</Button>
                <Button onClick={handleImportBeneficiaries} disabled={!selectedFile || isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
