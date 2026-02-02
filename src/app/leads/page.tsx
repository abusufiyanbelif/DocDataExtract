
'use client';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Plus, ShieldAlert, MoreHorizontal, Trash2, Edit, Copy } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import type { Lead } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { CopyLeadDialog } from '@/components/copy-lead-dialog';
import { copyLeadAction, deleteLeadAction } from './actions';


type SortKey = keyof Lead | 'srNo';

export default function LeadPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'startDate', direction: 'descending' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [leadToCopy, setLeadToCopy] = useState<Lead | null>(null);
  
  const { userProfile, isLoading: isProfileLoading } = useSession();

  const leadsCollectionRef = useMemo(() => {
    return collection(useFirestore()!, 'leads');
  }, [useFirestore()]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);

  const handleDeleteClick = (lead: Lead) => {
    if (!canDelete) return;
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleCopyClick = (lead: Lead) => {
    if (!canCreate) return;
    setLeadToCopy(lead);
    setIsCopyDialogOpen(true);
  };

  const handleCopyConfirm = async (options: { newName: string; copyBeneficiaries: boolean; copyDonations: boolean; copyRationLists: boolean; }) => {
    if (!leadToCopy || !canCreate) return;

    setIsCopyDialogOpen(false);
    toast({ title: 'Copying lead...', description: `Please wait while '${leadToCopy.name}' is being copied.`});
    
    const result = await copyLeadAction({
        sourceLeadId: leadToCopy.id,
        ...options
    });

    if (result.success) {
        toast({ title: 'Lead Copied', description: result.message, variant: 'success' });
        router.refresh();
    } else {
        toast({ title: 'Copy Failed', description: result.message, variant: 'destructive' });
    }

    setLeadToCopy(null);
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete || !canDelete) {
        toast({ title: 'Error', description: 'Could not delete lead.', variant: 'destructive'});
        return;
    };

    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    toast({ title: 'Deleting...', description: `Please wait while '${leadToDelete.name}' and all its data are being deleted.`});

    const result = await deleteLeadAction(leadToDelete.id);

    if (result.success) {
        toast({ title: 'Success', description: result.message, variant: 'success' });
        router.refresh();
    } else {
        toast({ title: 'Deletion Failed', description: result.message, variant: 'destructive' });
    }
    
    setIsDeleting(false);
    setLeadToDelete(null);
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
            const aValue = a[sortConfig.key as keyof Lead] ?? '';
            const bValue = b[sortConfig.key as keyof Lead] ?? '';
            
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
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.update;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.leads?.delete;
  
  if (!isLoading && userProfile && !canViewLeads) {
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
                    You do not have the required permissions to view leads.
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
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && (
                    [...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
                )}
                {!isLoading && filteredAndSortedLeads.map((lead) => (
                    <Card key={lead.id} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="truncate flex-1">{lead.name}</CardTitle>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {canUpdate && (
                                            <DropdownMenuItem
                                                onClick={() => router.push(`/leads/${lead.id}/summary`)}
                                                className="cursor-pointer"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {canCreate && (
                                            <DropdownMenuItem
                                                onClick={() => handleCopyClick(lead)}
                                                className="cursor-pointer"
                                            >
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy
                                            </DropdownMenuItem>
                                        )}
                                        {(canUpdate || canCreate) && canDelete && <DropdownMenuSeparator />}
                                        {canDelete && (
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(lead); }}
                                                className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardDescription>{lead.startDate} to {lead.endDate}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="flex justify-between text-sm text-muted-foreground">
                                <Badge variant="outline">{lead.category}</Badge>
                                <Badge variant={
                                    lead.status === 'Active' ? 'success' :
                                    lead.status === 'Completed' ? 'secondary' : 'outline'
                                }>{lead.status}</Badge>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/leads/${lead.id}/summary`}>
                                    View Details
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
             {!isLoading && filteredAndSortedLeads.length === 0 && (
                 <div className="text-center py-16">
                    <p className="text-muted-foreground">No leads found matching your criteria.</p>
                    {canCreate && leads?.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            <Link href="/leads/create" className="text-primary underline">
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
                    This action cannot be undone. This will permanently delete the lead '{leadToDelete?.name}' and all of its associated data, including beneficiaries and uploaded files.
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

        <CopyLeadDialog
            open={isCopyDialogOpen}
            onOpenChange={setIsCopyDialogOpen}
            lead={leadToCopy}
            onCopyConfirm={handleCopyConfirm}
        />

    </div>
  );
}
