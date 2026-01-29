'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useStorage, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, setDoc, DocumentReference } from 'firebase/firestore';
import type { Beneficiary, Campaign } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, Upload, Download, Eye, ArrowUp, ArrowDown } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BeneficiaryForm, type BeneficiaryFormData } from '@/components/beneficiary-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

type SortKey = keyof Beneficiary | 'srNo';

export default function BeneficiariesPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const campaignDocRef = useMemo(() => {
    if (!firestore || !campaignId || !userProfile) return null;
    return doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign>;
  }, [firestore, campaignId, userProfile]);
  const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);
  
  const beneficiariesCollectionRef = useMemo(() => {
    if (!firestore || !campaignId || !userProfile) return null;
    return collection(firestore, `campaigns/${campaignId}/beneficiaries`);
  }, [firestore, campaignId, userProfile]);
  const { data: beneficiaries, isLoading: areBeneficiariesLoading } = useCollection<Beneficiary>(beneficiariesCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [referralFilter, setReferralFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending'});
  
  const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
  const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
  const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
  const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;

  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.create;
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.update;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.delete;

  const handleAdd = () => {
    if (!canCreate) return;
    setEditingBeneficiary(null);
    setIsFormOpen(true);
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    if (!canUpdate) return;
    setEditingBeneficiary(beneficiary);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (!canDelete) return;
    setBeneficiaryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewImage = (url: string) => {
    setImageToView(url);
    setIsImageViewerOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!beneficiaryToDelete || !firestore || !storage || !campaignId || !canDelete) return;

    const beneficiaryData = beneficiaries.find(b => b.id === beneficiaryToDelete);
    if (!beneficiaryData) return;
    
    const docRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, beneficiaryToDelete);
    const idProofUrl = beneficiaryData.idProofUrl;

    setIsDeleteDialogOpen(false);
    toast({ title: 'Deleting...', description: 'Please wait while the beneficiary is being deleted.'});

    const deleteDocument = () => {
        deleteDoc(docRef)
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                toast({ title: 'Success', description: 'Beneficiary deleted successfully.', variant: 'success' });
                setBeneficiaryToDelete(null);
            });
    };

    if (idProofUrl) {
        deleteObject(storageRef(storage, idProofUrl))
            .finally(() => {
                deleteDocument();
            });
    } else {
        deleteDocument();
    }
  };
  
  const handleFormSubmit = async (data: BeneficiaryFormData) => {
    if (!firestore || !storage || !campaignId || !userProfile) return;
    if (editingBeneficiary && !canUpdate) return;
    if (!editingBeneficiary && !canCreate) return;

    if (!editingBeneficiary) {
        const isDuplicate = beneficiaries.some(b => 
            b.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
            (b.phone || '') === (data.phone || '')
        );
        if (isDuplicate) {
            toast({
                title: 'Duplicate Beneficiary',
                description: 'A beneficiary with the same name and phone number already exists in this campaign.',
                variant: 'destructive',
            });
            return;
        }
    }

    const docRef = editingBeneficiary
        ? doc(firestore, `campaigns/${campaignId}/beneficiaries`, editingBeneficiary.id)
        : doc(collection(firestore, `campaigns/${campaignId}/beneficiaries`));

    let idProofUrl = editingBeneficiary?.idProofUrl || '';
    
    try {
        const fileList = data.idProofFile as FileList | undefined;
        if (fileList && fileList.length > 0) {
            const file = fileList[0];
            toast({
                title: "Uploading ID Proof...",
                description: `Please wait while '${file.name}' is uploaded.`,
            });
            
            const today = new Date().toISOString().split('T')[0];
            const fileNameParts = [ data.name, data.phone || 'no-phone', today, 'referby', data.referralBy ];
            const sanitizedBaseName = fileNameParts.join('_').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_{2,}/g, '_');
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const finalFileName = `${docRef.id}_${sanitizedBaseName}.${fileExtension}`;
            const filePath = `campaigns/${campaignId}/beneficiaries/${finalFileName}`;
            const fileRef = storageRef(storage, filePath);

            const uploadResult = await uploadBytes(fileRef, file);
            idProofUrl = await getDownloadURL(uploadResult.ref);
        }

        const { idProofFile, ...beneficiaryData } = data;

        const finalData = {
            ...beneficiaryData,
            idProofUrl,
            ...(!editingBeneficiary && {
                addedDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
                createdById: userProfile.id,
                createdByName: userProfile.name,
            }),
        };
        
        setDoc(docRef, finalData, { merge: true })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: editingBeneficiary ? 'update' : 'create',
                    requestResourceData: finalData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                toast({ title: 'Success', description: `Beneficiary ${editingBeneficiary ? 'updated' : 'added'}.`, variant: 'success' });
                setIsFormOpen(false);
                setEditingBeneficiary(null);
            });

    } catch (error) {
        console.error("Error during file upload:", error);
        toast({ title: 'File Upload Error', description: 'Could not upload the ID proof file.', variant: 'destructive' });
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
    if (!selectedFile || !firestore || !campaignId || !canCreate || !userProfile) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

            if (json.length === 0) throw new Error("The file is empty.");

            const requiredHeaders = ['name', 'referralBy'];
            const actualHeaders = Object.keys(json[0] || {});
            if (!requiredHeaders.every(h => actualHeaders.includes(h))) {
                 throw new Error(`File is missing required headers. Required: ${requiredHeaders.join(', ')}`);
            }
            
            const batch = writeBatch(firestore);
            const beneficiariesRef = collection(firestore, `campaigns/${campaignId}/beneficiaries`);
            
            const validBeneficiaries: Omit<Beneficiary, 'id'>[] = [];
            const invalidRows: number[] = [];
            const validStatuses = ['Given', 'Pending', 'Hold', 'Need More Details', 'Verified'];

            json.forEach((row, index) => {
                const name = String(row.name || '').trim();
                const referralBy = String(row.referralBy || '').trim();
                const members = Number(row.members || 0);
                const earningMembers = Number(row.earningMembers || 0);
                const male = Number(row.male || 0);
                const female = Number(row.female || 0);
                const kitAmount = Number(row.kitAmount || 0);
                const status = String(row.status || 'Pending').trim();

                if (!name || !referralBy || isNaN(members) || isNaN(earningMembers) || isNaN(male) || isNaN(female) || isNaN(kitAmount)) {
                    invalidRows.push(index + 2); // +2 because index is 0-based and header is row 1
                    return;
                }
                
                const beneficiaryData: Omit<Beneficiary, 'id'> = {
                    name,
                    address: String(row.address || '').trim(),
                    phone: String(row.phone || '').trim(),
                    members,
                    earningMembers,
                    male,
                    female,
                    idProofType: String(row.idProofType || '').trim(),
                    idNumber: String(row.idNumber || '').trim(),
                    referralBy,
                    kitAmount,
                    status: validStatuses.includes(status) ? status : 'Pending',
                    addedDate: new Date().toISOString().split('T')[0],
                    createdAt: serverTimestamp(),
                    createdById: userProfile.id,
                    createdByName: userProfile.name,
                };
                validBeneficiaries.push(beneficiaryData);
            });
            
            if (validBeneficiaries.length === 0) {
                throw new Error("No valid beneficiary data found in the file. Please check for missing names or referral info.");
            }

            validBeneficiaries.forEach(beneficiary => {
                const docRef = doc(beneficiariesRef);
                batch.set(docRef, beneficiary);
            });
            
            batch.commit()
                .catch((serverError: any) => {
                    const permissionError = new FirestorePermissionError({
                        path: `campaigns/${campaignId}/beneficiaries`,
                        operation: 'write',
                        requestResourceData: { note: `${validBeneficiaries.length} beneficiaries to import` }
                    });
                    errorEmitter.emit('permission-error', permissionError);
                })
                .finally(() => {
                    if (invalidRows.length > 0) {
                         toast({ 
                            title: 'Partial Import Success',
                            description: `${validBeneficiaries.length} beneficiaries imported. ${invalidRows.length} rows were invalid and skipped (Rows: ${invalidRows.join(', ')}).`,
                            variant: 'success',
                            duration: 8000,
                         });
                    } else {
                        toast({ title: 'Success', description: `${validBeneficiaries.length} beneficiaries imported successfully.`, variant: 'success' });
                    }
                    setIsImporting(false);
                    setIsImportOpen(false);
                    setSelectedFile(null);
                });

        } catch (error: any) {
             toast({ title: 'Import Failed', description: error.message || "An error occurred during import.", variant: 'destructive' });
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
  
  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const uniqueReferrals = useMemo(() => {
    if (!beneficiaries) return [];
    const referrals = new Set(beneficiaries.map(b => b.referralBy).filter(Boolean));
    return ['All', ...Array.from(referrals).sort()];
  }, [beneficiaries]);
  
  const filteredAndSortedBeneficiaries = useMemo(() => {
    if (!beneficiaries) return [];
    let sortableItems = [...beneficiaries];
    
    // Filtering
    if (statusFilter !== 'All') {
        sortableItems = sortableItems.filter(b => b.status === statusFilter);
    }
    if (referralFilter !== 'All') {
        sortableItems = sortableItems.filter(b => b.referralBy === referralFilter);
    }
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        sortableItems = sortableItems.filter(b => 
            (b.name || '').toLowerCase().includes(lowercasedTerm) ||
            (b.phone || '').toLowerCase().includes(lowercasedTerm) ||
            (b.address || '').toLowerCase().includes(lowercasedTerm) ||
            (b.referralBy || '').toLowerCase().includes(lowercasedTerm)
        );
    }

    // Sorting
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'srNo') return 0; // Keep original order for srNo
            const aValue = a[sortConfig.key as keyof Beneficiary] ?? '';
            const bValue = b[sortConfig.key as keyof Beneficiary] ?? '';
            
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
  }, [beneficiaries, searchTerm, statusFilter, referralFilter, sortConfig]);

  const totalKitAmount = useMemo(() => {
    return filteredAndSortedBeneficiaries.reduce((acc, b) => acc + (b.kitAmount || 0), 0);
  }, [filteredAndSortedBeneficiaries]);

  const isLoading = isCampaignLoading || areBeneficiariesLoading || isProfileLoading;
  
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
        
        <div className="flex flex-wrap gap-2 border-b mb-4">
            {canReadSummary && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
              </Button>
            )}
            {canReadRation && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}`}>{campaign.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
              </Button>
            )}
            {canReadBeneficiaries && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                  <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
              </Button>
            )}
             {canReadDonations && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}/donations`}>Donations</Link>
              </Button>
            )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                    <CardTitle>Beneficiary List ({filteredAndSortedBeneficiaries.length})</CardTitle>
                    <p className="text-muted-foreground">
                        Total amount for filtered beneficiaries: <span className="font-bold text-foreground">Rupee {totalKitAmount.toFixed(2)}</span>
                    </p>
                </div>
                {canCreate && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <Button variant="outline" onClick={handleDownloadTemplate}>
                            <Download className="mr-2 h-4 w-4" />
                            Template
                        </Button>
                        <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import
                        </Button>
                        <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New
                        </Button>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
                <Input 
                    placeholder="Search by name, phone, address, referral..."
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
                        <SelectItem value="Given">Given</SelectItem>
                        <SelectItem value="Verified">Verified</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Hold">Hold</SelectItem>
                        <SelectItem value="Need More Details">Need More Details</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={referralFilter} onValueChange={setReferralFilter}>
                    <SelectTrigger className="w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by referral" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueReferrals.map(referral => (
                            <SelectItem key={referral} value={referral}>
                                {referral === 'All' ? 'All Referrals' : referral}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          {(canUpdate || canDelete) && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                          <SortableHeader sortKey="srNo">#</SortableHeader>
                          <SortableHeader sortKey="name">Name</SortableHeader>
                          <SortableHeader sortKey="address">Address</SortableHeader>
                          <SortableHeader sortKey="phone">Phone</SortableHeader>
                          <SortableHeader sortKey="members">Members</SortableHeader>
                          <SortableHeader sortKey="earningMembers">Earning</SortableHeader>
                          <SortableHeader sortKey="male">M/F</SortableHeader>
                          <SortableHeader sortKey="addedDate">Added Date</SortableHeader>
                          <TableHead>ID Proof Type</TableHead>
                          <TableHead>ID Number</TableHead>
                          <TableHead>ID Proof</TableHead>
                          <SortableHeader sortKey="referralBy">Referred By</SortableHeader>
                          <SortableHeader sortKey="kitAmount">Kit Amount (Rupee)</SortableHeader>
                          <SortableHeader sortKey="status">Status</SortableHeader>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {areBeneficiariesLoading && (
                        [...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell colSpan={(canUpdate || canDelete) ? 15 : 14}><Skeleton className="h-6 w-full" /></TableCell>
                           </TableRow>
                        ))
                      )}
                      {!areBeneficiariesLoading && filteredAndSortedBeneficiaries.map((beneficiary, index) => (
                          <TableRow key={beneficiary.id}>
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
                                                <DropdownMenuItem onClick={() => handleEdit(beneficiary)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                            )}
                                            {canDelete && (
                                                <DropdownMenuItem onClick={() => handleDeleteClick(beneficiary.id)} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            )}
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
                              <TableCell>
                                  {beneficiary.idProofUrl ? (
                                    <Button variant="outline" size="sm" onClick={() => handleViewImage(beneficiary.idProofUrl!)}>
                                        <Eye className="mr-2 h-4 w-4" /> View
                                    </Button>
                                  ) : "N/A"}
                              </TableCell>
                              <TableCell>{beneficiary.referralBy}</TableCell>
                              <TableCell className="text-right font-medium">Rupee {(beneficiary.kitAmount || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                  <Badge variant={
                                      beneficiary.status === 'Given' ? 'success' :
                                      beneficiary.status === 'Verified' ? 'success' :
                                      beneficiary.status === 'Pending' ? 'secondary' :
                                      beneficiary.status === 'Hold' ? 'destructive' : 'outline'
                                  }>{beneficiary.status}</Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                      {!areBeneficiariesLoading && filteredAndSortedBeneficiaries.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={(canUpdate || canDelete) ? 15 : 14} className="text-center h-24 text-muted-foreground">
                                No beneficiaries found matching your criteria.
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
        <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingBeneficiary ? 'Edit' : 'Add'} Beneficiary</DialogTitle>
            </DialogHeader>
            <BeneficiaryForm
                beneficiary={editingBeneficiary}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                rationLists={campaign?.rationLists || {}}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the beneficiary record and its associated ID proof file from storage.
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
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>ID Proof</DialogTitle>
            </DialogHeader>
            {imageToView && (
                <div className="relative h-[70vh] w-full mt-4">
                    <Image src={imageToView} alt="ID proof" fill className="object-contain" />
                </div>
            )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
