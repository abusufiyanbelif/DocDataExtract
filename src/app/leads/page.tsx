
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
import type { Lead, Beneficiary, Donation } from '@/lib/types';
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
import { cn } from '@/lib/utils';


type SortKey = keyof Lead | 'srNo';

export default function LeadPage() {
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
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const leadsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'leads');
  }, [firestore]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);

  const handleRowClick = (leadId: string) => {
    // router.push(`/leads/${leadId}/summary`);
  };
  
  const handleDeleteClick = (lead: Lead) => {
    if (!canDelete) return;
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete || !firestore || !storage || !canDelete) {
        toast({ title: 'Error', description: 'Could not delete lead.', variant: 'destructive'});
        return;
    };

    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    toast({ title: 'Deleting...', description: `Please wait while '${leadToDelete.name}' and all its data are being deleted.`});

    try {
        const leadId = leadToDelete.id;

        const beneficiariesRef = collection(firestore, `leads/${leadId}/beneficiaries`);
        const beneficiariesSnap = await getDocs(beneficiariesRef);

        const storageUrls: string[] = [];
        beneficiariesSnap.forEach(doc => {
            const data = doc.data() as Beneficiary;
            if (data.idProofUrl) storageUrls.push(data.idProofUrl);
        });

        const deleteFilePromises = storageUrls.map(url => {
            const fileRef = storageRef(storage, url);
            return deleteObject(fileRef).catch(error => {
                if (error.code !== 'storage/object-not-found') {
                    console.warn(`Failed to delete file ${url}`, error);
                }
            });
        });

        await Promise.all(deleteFilePromises);
        
        const batch = writeBatch(firestore);
        beneficiariesSnap.forEach(doc => batch.delete(doc.ref));
        batch.delete(doc(firestore, 'leads', leadId));

        await batch.commit();
        
        toast({ title: 'Success', description: `Lead '${leadToDelete.name}' was successfully deleted.`, variant: 'success' });

    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `leads/${leadToDelete.id} and all sub-collections`, operation: 'delete' }));
    } finally {
        setIsDeleting(false);
        setLeadToDelete(null);
    }
  };


  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const filteredAndSortedLeads = useMemo(() => {
    if (!leads) return [];
    let sortableItems = [...leads];
    
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
  }, [leads, searchTerm, statusFilter, categoryFilter, sortConfig]);

  const isLoading = areLeadsLoading || isProfileLoading || isDeleting;
  
  const leadPerms = userProfile?.permissions?.leads;
  const canReadAnySubmodule = 
    !!leadPerms?.summary?.read ||
    !!leadPerms?.ration?.read ||
    !!leadPerms?.beneficiaries?.read ||
    !!leadPerms?.donations?.read;
  const canViewLeads = userProfile?.role === 'Admin' || !!leadPerms?.read || canReadAnySubmodule;
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.create;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.delete;
  
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
  
  if (!isLoading && userProfile && !canViewLeads) {
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
                    You do not have the required permissions to view leads.
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
                <CardTitle>Leads</CardTitle>
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
                <Link href="/leads/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Lead
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                  <SortableHeader sortKey="srNo" className="w-[50px]">#</SortableHeader>
                  <SortableHeader sortKey="name">Lead Name</SortableHeader>
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
                {!isLoading && filteredAndSortedLeads.map((lead, index) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => handleRowClick(lead.id)}>
                    {canDelete && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {canDelete && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(lead); }} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                      </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    )}
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.category}</TableCell>
                    <TableCell>{lead.startDate}</TableCell>
                    <TableCell>{lead.endDate}</TableCell>
                    <TableCell>{lead.status}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredAndSortedLeads.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={canDelete ? 7 : 6} className="text-center text-muted-foreground h-24">
                           No leads found matching your criteria. {canCreate && leads?.length === 0 && <Link href="/leads/create" className="text-primary underline">Create one now</Link>}
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
                    This action cannot be undone. This will permanently delete the lead '{leadToDelete?.name}' and all of its associated data.
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
