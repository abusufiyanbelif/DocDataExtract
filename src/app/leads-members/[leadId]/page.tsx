
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { SecurityRuleContext } from '@/firebase';
import { useSession } from '@/hooks/use-session';
import { doc, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Lead, RationItem } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Download, Loader2, Edit, Save, Copy } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { get } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const quantityTypes = ['kg', 'litre', 'gram', 'ml', 'piece', 'packet', 'dozen'];

export default function LeadDetailsPage() {
  const params = useParams();
  const leadId = params.leadId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useSession();
  
  const leadDocRef = useMemo(() => {
    if (!firestore || !leadId) return null;
    return doc(firestore, 'leads', leadId) as DocumentReference<Lead>;
  }, [firestore, leadId]);

  const { data: lead, isLoading: isLeadLoading } = useDoc<Lead>(leadDocRef);

  const [editMode, setEditMode] = useState(false);
  const [editableLead, setEditableLead] = useState<Lead | null>(null);
  
  // Reset local state if edit mode is cancelled or if the base data changes while NOT in edit mode.
  useEffect(() => {
    if (lead && !editMode) {
      setEditableLead(JSON.parse(JSON.stringify(lead)));
    }
  }, [editMode, lead])
  
  const canUpdate = userProfile?.role === 'Admin' || get(userProfile, 'permissions.leads-members.update', false);

  const isLoading = isLeadLoading || isProfileLoading;

  const handleSave = () => {
    if (!leadDocRef || !editableLead || !canUpdate) return;

    // Only send the fields that are editable on this page
    const saveData: Partial<Lead> = {
        name: editableLead.name,
        description: editableLead.description,
        startDate: editableLead.startDate,
        endDate: editableLead.endDate,
        status: editableLead.status,
        category: editableLead.category,
        targetAmount: editableLead.targetAmount
    };
    
    updateDoc(leadDocRef, saveData)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: leadDocRef.path,
                operation: 'update',
                requestResourceData: saveData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            toast({ title: 'Success', description: 'Lead details saved.', variant: 'success' });
            setEditMode(false);
        });
  };

  const handleCancel = () => {
      setEditMode(false);
      // editableLead will be reset by the useEffect
  };

  const handleFieldChange = (field: keyof Lead, value: any) => {
    if (!editableLead) return;
    setEditableLead(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  if (isLoading || !editableLead) {
    return (
        <div className="min-h-screen text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Skeleton className="h-10 w-44" />
                </div>
                <Skeleton className="h-9 w-64 mb-4" />
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div>
                                <Skeleton className="h-8 w-48 mb-4" />
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-96" />
                                    <Skeleton className="h-6 w-80" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-32" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
  }

  if (!lead) {
    return (
        <div className="min-h-screen text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8 text-center">
                <p className="text-lg text-muted-foreground">Lead not found.</p>
                <Button asChild className="mt-4">
                    <Link href="/leads-members">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Leads
                    </Link>
                </Button>
            </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <DocuExtractHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-4">
            <Button variant="outline" asChild>
                <Link href="/leads-members">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Leads
                </Link>
            </Button>
        </div>
        
        <Card>
          <CardHeader>
             <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1">
                    <CardTitle>Lead Details</CardTitle>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {canUpdate && (
                        !editMode ? (
                            <Button onClick={() => setEditMode(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                                <Button onClick={handleSave}>
                                    <Save className="mr-2 h-4 w-4" /> Save
                                </Button>
                            </div>
                        )
                    )}
                </div>
             </div>
          </CardHeader>
          <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <Label htmlFor="leadName">Lead Name</Label>
                        <Input id="leadName" value={editableLead.name} onChange={(e) => handleFieldChange('name', e.target.value)} disabled={!editMode || !canUpdate} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="category">Category</Label>
                        <Select value={editableLead.category} onValueChange={(value) => handleFieldChange('category', value)} disabled={!editMode || !canUpdate}>
                            <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ration">Ration</SelectItem>
                                <SelectItem value="Relief">Relief</SelectItem>
                                <SelectItem value="General">General</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="status">Status</Label>
                        <Select value={editableLead.status} onValueChange={(value) => handleFieldChange('status', value)} disabled={!editMode || !canUpdate}>
                            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Upcoming">Upcoming</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" type="date" value={editableLead.startDate} onChange={(e) => handleFieldChange('startDate', e.target.value)} disabled={!editMode || !canUpdate} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" type="date" value={editableLead.endDate} onChange={(e) => handleFieldChange('endDate', e.target.value)} disabled={!editMode || !canUpdate} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="targetAmount">Target Amount</Label>
                        <Input id="targetAmount" type="number" value={editableLead.targetAmount} onChange={(e) => handleFieldChange('targetAmount', Number(e.target.value))} disabled={!editMode || !canUpdate} />
                    </div>
                </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
