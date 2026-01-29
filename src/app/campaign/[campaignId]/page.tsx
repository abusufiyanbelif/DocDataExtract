'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, updateDoc, DocumentReference } from 'firebase/firestore';
import type { Campaign, RationItem } from '@/lib/types';
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  const campaignDocRef = useMemo(() => {
    if (!firestore || !campaignId || !userProfile) return null;
    return doc(firestore, 'campaigns', campaignId) as DocumentReference<Campaign>;
  }, [firestore, campaignId, userProfile]);

  const { data: campaign, isLoading: isCampaignLoading } = useDoc<Campaign>(campaignDocRef);

  const [editMode, setEditMode] = useState(false);
  const [editableCampaign, setEditableCampaign] = useState<Campaign | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newMemberCount, setNewMemberCount] = useState('');

  // Copy items state
  const [isCopyItemsOpen, setIsCopyItemsOpen] = useState(false);
  const [copyTargetCategory, setCopyTargetCategory] = useState<string | null>(null);
  const [itemsToCopy, setItemsToCopy] = useState<RationItem[]>([]);

  // Reset local state if edit mode is cancelled or if the base data changes while NOT in edit mode.
  useEffect(() => {
    if (campaign && !editMode) {
      setEditableCampaign(JSON.parse(JSON.stringify(campaign)));
    }
  }, [editMode, campaign])

  const canReadSummary = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.summary?.read;
  const canReadRation = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.read;
  const canReadBeneficiaries = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.beneficiaries?.read;
  const canReadDonations = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.donations?.read;
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.campaigns?.ration?.update;

  const isLoading = isCampaignLoading || isProfileLoading;

  const handleSave = () => {
    if (!campaignDocRef || !editableCampaign || !canUpdate) return;

    // Only send the fields that are editable on this page to respect granular security rules
    const saveData = {
        priceDate: editableCampaign.priceDate,
        shopName: editableCampaign.shopName,
        shopContact: editableCampaign.shopContact,
        shopAddress: editableCampaign.shopAddress,
        rationLists: editableCampaign.rationLists,
    };
    
    updateDoc(campaignDocRef, saveData)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: campaignDocRef.path,
                operation: 'update',
                requestResourceData: saveData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            toast({ title: 'Success', description: 'Campaign details saved.' });
            setEditMode(false);
        });
  };

  const handleCancel = () => {
      setEditMode(false);
      // editableCampaign will be reset by the useEffect
  };

  const handleFieldChange = (field: keyof Campaign, value: any) => {
    if (!editableCampaign) return;
    setEditableCampaign(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleItemChange = (
    memberCount: string,
    itemId: string,
    field: keyof RationItem,
    value: string | number
  ) => {
    if (!editableCampaign) return;
    const newRationLists = { ...editableCampaign.rationLists };
    newRationLists[memberCount] = newRationLists[memberCount].map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
    );
    handleFieldChange('rationLists', newRationLists);
  };

  const handleAddItem = (memberCount: string) => {
    if (!editableCampaign) return;
    const newItem: RationItem = {
      id: `${memberCount}-${Date.now()}`,
      name: '',
      quantity: '',
      price: 0,
      notes: '',
    };
    const newRationLists = { ...editableCampaign.rationLists };
    newRationLists[memberCount] = [...(newRationLists[memberCount] || []), newItem];
    handleFieldChange('rationLists', newRationLists);
  };

  const handleDeleteItem = (memberCount: string, itemId: string) => {
    if (!editableCampaign) return;
    const newRationLists = { ...editableCampaign.rationLists };
    newRationLists[memberCount] = newRationLists[memberCount].filter(item => item.id !== itemId);
    handleFieldChange('rationLists', newRationLists);
  };

  const calculateTotal = (items: RationItem[]) => {
    return items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  };

  const handleDownload = (format: 'csv' | 'excel' | 'pdf') => {
    if (!campaign) {
      toast({
        title: 'No Data',
        description: 'There is no campaign data to export.',
        variant: 'destructive',
      });
      return;
    }
    
    const { rationLists, priceDate, shopName, shopContact, shopAddress } = campaign;
    const hasData = Object.values(rationLists).some(list => list.length > 0);
    if (!hasData) {
      toast({
        title: 'No Data',
        description: 'There is no ration data to export.',
        variant: 'destructive',
      });
      return;
    }

    const sortedMemberCategories = Object.keys(rationLists).sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return Number(b) - Number(a);
    });

    if (format === 'csv') {
      let csvContent = `Ration Details\n`;
      csvContent += `Price Date:,"${priceDate || ''}"\n`;
      csvContent += `Shop Name:,"${shopName || ''}"\n`;
      csvContent += `Shop Contact:,"${shopContact || ''}"\n`;
      csvContent += `Shop Address:,"${shopAddress || ''}"\n\n`;

      sortedMemberCategories.forEach((memberCount) => {
          const items = rationLists[memberCount];
          if (items.length > 0) {
              const categoryTitle = memberCount === 'General' ? 'General' : `For ${memberCount} Members`;
              csvContent += `"${categoryTitle}"\n`;
              csvContent += '#,Item Name,Quantity,Notes,Price (₹)\n';

              items.forEach((item, index) => {
                  const row = [
                      index + 1,
                      `"${(item.name || '').replace(/"/g, '""')}"`,
                      `"${(item.quantity || '').replace(/"/g, '""')}"`,
                      `"${(item.notes || '').replace(/"/g, '""')}"`,
                      item.price || 0,
                  ].join(',');
                  csvContent += row + '\n';
              });

              const total = calculateTotal(items);
              csvContent += `,,,Total,${total}\n\n`;
          }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ration-details-${priceDate}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        sortedMemberCategories.forEach((memberCount) => {
            const items = rationLists[memberCount];
            if (items.length > 0) {
                const categoryTitle = memberCount === 'General' ? 'General' : `For ${memberCount} Members`;
                const total = calculateTotal(items);

                const header = ['#', 'Item Name', 'Quantity', 'Notes', 'Price (₹)'];
                const body = items.map((item, index) => [
                    index + 1,
                    item.name,
                    item.quantity,
                    item.notes,
                    item.price,
                ]);

                const table = [header, ...body, ['', '', '', 'Total', total]];

                const ws = XLSX.utils.aoa_to_sheet([]);
                
                XLSX.utils.sheet_add_aoa(ws, [
                    [`Shop Name:`, shopName],
                    [`Shop Contact:`, shopContact],
                    [`Shop Address:`, shopAddress],
                    [`Price Date:`, priceDate],
                    [], 
                    [categoryTitle],
                    [], 
                ], { origin: 'A1' });

                XLSX.utils.sheet_add_aoa(ws, table, { origin: 'A8' });

                ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }];
                XLSX.utils.book_append_sheet(wb, ws, categoryTitle);
            }
        });

        XLSX.writeFile(wb, `ration-details-${priceDate}.xlsx`);

    } else if (format === 'pdf') {
        const doc = new jsPDF();
        let startY = 20;

        doc.setFontSize(14);
        doc.text(`Ration Details`, 14, 15);
        
        doc.setFontSize(10);
        doc.text(`Shop: ${shopName || ''} | Contact: ${shopContact || ''} | Address: ${shopAddress || ''}`, 14, 22);
        doc.text(`Price Date: ${priceDate || ''}`, 14, 27);

        startY = 35;
        
        sortedMemberCategories.forEach((memberCount) => {
            const items = rationLists[memberCount];
            if (items.length > 0) {
                const total = calculateTotal(items);
                const tableBody = items.map((item, index) => [
                    index + 1,
                    item.name,
                    item.quantity,
                    item.notes,
                    `₹${(item.price || 0).toFixed(2)}`,
                ]);

                (tableBody as any).push([
                    { content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `₹${total.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
                ]);
                
                (doc as any).autoTable({
                    head: [[memberCount === 'General' ? 'General' : `For ${memberCount} Members`]],
                    startY: startY,
                    theme: 'plain',
                    styles: { fontStyle: 'bold', fontSize: 12 }
                });

                startY = (doc as any).lastAutoTable.finalY;

                (doc as any).autoTable({
                    head: [['#', 'Item Name', 'Quantity', 'Notes', 'Price (₹)']],
                    body: tableBody,
                    startY: startY,
                });
                
                startY = (doc as any).lastAutoTable.finalY + 10;
            }
        });

        doc.save(`ration-details-${priceDate}.pdf`);
    }
  };

  const handleAddNewCategory = () => {
    if (!editableCampaign) return;
    if (!newMemberCount || isNaN(Number(newMemberCount)) || Number(newMemberCount) <= 0) {
        toast({
            title: 'Invalid Input',
            description: 'Please enter a valid positive number for members.',
            variant: 'destructive',
        });
        return;
    }
    const newCountStr = String(Math.floor(Number(newMemberCount)));
    if (editableCampaign.rationLists[newCountStr]) {
        toast({
            title: 'Category Exists',
            description: `A category for ${newCountStr} members already exists.`,
            variant: 'destructive',
        });
        return;
    }
    
    const newRationLists = { ...editableCampaign.rationLists, [newCountStr]: [] };
    handleFieldChange('rationLists', newRationLists);
    setNewMemberCount('');
    setIsAddCategoryOpen(false);
  };
  
  const memberCategories = useMemo(() => {
    if (!editableCampaign) return [];
    return Object.keys(editableCampaign.rationLists).sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return Number(b) - Number(a);
    });
  }, [editableCampaign]);

  const allUniqueItems = useMemo(() => {
    if (!editableCampaign) return [];
    const allItems = Object.values(editableCampaign.rationLists).flat();
    const uniqueItemsMap = new Map<string, RationItem>();
    allItems.forEach(item => {
        if (item.name && !uniqueItemsMap.has(item.name.toLowerCase().trim())) {
            uniqueItemsMap.set(item.name.toLowerCase().trim(), item);
        }
    });
    return Array.from(uniqueItemsMap.values());
  }, [editableCampaign]);

  const handleConfirmCopy = () => {
    if (!editableCampaign || !copyTargetCategory || itemsToCopy.length === 0) return;

    const newItems = itemsToCopy.map((item, index) => ({
        ...item,
        id: `${copyTargetCategory}-${Date.now()}-${index}`,
    }));

    const newRationLists = { ...editableCampaign.rationLists };
    const currentList = newRationLists[copyTargetCategory] || [];
    newRationLists[copyTargetCategory] = [...currentList, ...newItems];

    handleFieldChange('rationLists', newRationLists);

    setIsCopyItemsOpen(false);
    setCopyTargetCategory(null);
    setItemsToCopy([]);
  };

  const renderRationTable = (memberCount: string) => {
    const items = editableCampaign?.rationLists?.[memberCount] || [];
    const total = calculateTotal(items);

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h4 className="text-lg font-bold">Total: <span className="font-mono">₹{total.toFixed(2)}</span></h4>
            {canUpdate && editMode && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleAddItem(memberCount)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Button variant="outline" onClick={() => { setCopyTargetCategory(memberCount); setItemsToCopy([]); setIsCopyItemsOpen(true); }}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Items
                </Button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[30%]">Item Name</TableHead>
                  <TableHead className="w-[15%]">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[120px] text-right">Price (₹)</TableHead>
                  {canUpdate && editMode && <TableHead className="w-[50px] text-center">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={item.name || ''}
                        onChange={e => handleItemChange(memberCount, item.id, 'name', e.target.value)}
                        placeholder="Item name"
                        disabled={!editMode || !canUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.quantity || ''}
                        onChange={e => handleItemChange(memberCount, item.id, 'quantity', e.target.value)}
                        placeholder="e.g. 10 kg"
                        disabled={!editMode || !canUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.notes || ''}
                        onChange={e => handleItemChange(memberCount, item.id, 'notes', e.target.value)}
                        placeholder="e.g. @60/kg"
                        disabled={!editMode || !canUpdate}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.price || 0}
                        onChange={e => handleItemChange(memberCount, item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="text-right"
                        disabled={!editMode || !canUpdate}
                      />
                    </TableCell>
                    {canUpdate && editMode && (
                        <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(memberCount, item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (isLoading || !editableCampaign) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-4">
                    <Skeleton className="h-10 w-44" />
                </div>
                <Skeleton className="h-9 w-64 mb-4" />
                <div className="flex flex-wrap gap-2 border-b mb-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-28" />
                </div>
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
            <h1 className="text-3xl font-bold">{editableCampaign.name}</h1>
        </div>
        
        <div className="flex flex-wrap gap-2 border-b mb-4">
            {canReadSummary && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                  <Link href={`/campaign/${campaignId}/summary`}>Summary</Link>
              </Button>
            )}
            {canReadRation && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                  <Link href={`/campaign/${campaignId}`}>{editableCampaign.category === 'Ration' ? 'Ration Details' : 'Item List'}</Link>
              </Button>
            )}
            {canReadBeneficiaries && (
              <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
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
             <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <CardTitle>{editableCampaign.category === 'Ration' ? 'Ration Details' : 'Item List'}</CardTitle>
                    {editableCampaign.category === 'Ration' && (
                        <div className="text-sm text-muted-foreground mt-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="priceDate" className="text-nowrap">Price Date:</Label>
                                    <Input
                                    id="priceDate"
                                    type="date"
                                    value={editableCampaign.priceDate || ''}
                                    onChange={(e) => handleFieldChange( 'priceDate', e.target.value )}
                                    className="w-fit"
                                    disabled={!editMode || !canUpdate}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="shopName" className="text-nowrap">Shop Name:</Label>
                                    <Input
                                    id="shopName"
                                    value={editableCampaign.shopName || ''}
                                    onChange={(e) => handleFieldChange( 'shopName', e.target.value )}
                                    className="w-fit"
                                    placeholder="Shop Name"
                                    disabled={!editMode || !canUpdate}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="shopContact" className="text-nowrap">Shop Contact:</Label>
                                    <Input
                                    id="shopContact"
                                    value={editableCampaign.shopContact || ''}
                                    onChange={(e) => handleFieldChange( 'shopContact', e.target.value )}
                                    className="w-fit"
                                    placeholder="Contact Number"
                                    disabled={!editMode || !canUpdate}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="shopAddress" className="text-nowrap">Shop Address:</Label>
                                    <Input
                                    id="shopAddress"
                                    value={editableCampaign.shopAddress || ''}
                                    onChange={(e) => handleFieldChange( 'shopAddress', e.target.value )}
                                    className="w-full max-w-xs"
                                    placeholder="Shop Address"
                                    disabled={!editMode || !canUpdate}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleDownload('csv')}>Download as CSV</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload('excel')}>Download as Excel</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload('pdf')}>Download as PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {canUpdate && editMode && editableCampaign.category === 'Ration' && (
                        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Category
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add New Member Category</DialogTitle>
                                    <DialogDescription>
                                        Enter the number of family members for the new ration list.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="member-count" className="text-right">
                                            Members
                                        </Label>
                                        <Input
                                            id="member-count"
                                            type="number"
                                            value={newMemberCount}
                                            onChange={(e) => setNewMemberCount(e.target.value)}
                                            className="col-span-3"
                                            placeholder="e.g. 4"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                                    <Button type="submit" onClick={handleAddNewCategory}>Add Category</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
             </div>
          </CardHeader>
          <CardContent>
             {editableCampaign.category === 'Ration' ? (
                memberCategories.length > 0 ? (
                    <Tabs defaultValue={memberCategories[0]} className="w-full">
                    <TabsList className="h-auto flex-wrap justify-start">
                        {memberCategories.map(count => (
                            <TabsTrigger key={count} value={count}>{count === 'General' ? 'General' : `For ${count} Members`}</TabsTrigger>
                        ))}
                    </TabsList>
                    {memberCategories.map(count => (
                        <TabsContent key={count} value={count} className="mt-4">
                            {renderRationTable(count)}
                        </TabsContent>
                    ))}
                    </Tabs>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        No ration categories defined for this campaign yet.
                        {canUpdate && editMode && " Click 'Add Category' to begin."}
                    </div>
                )
            ) : (
                <div className="mt-4">
                    {renderRationTable('General')}
                </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isCopyItemsOpen} onOpenChange={setIsCopyItemsOpen}>
        <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>Copy Items to "{copyTargetCategory}" List</DialogTitle>
                <DialogDescription>Select items from other lists to add them to the current list.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="space-y-4">
                     {allUniqueItems.length > 0 && (
                        <>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="copy-all"
                                    checked={
                                        itemsToCopy.length === allUniqueItems.length
                                            ? true
                                            : itemsToCopy.length > 0
                                            ? 'indeterminate'
                                            : false
                                    }
                                    onCheckedChange={(checked) => {
                                        setItemsToCopy(checked ? allUniqueItems : []);
                                    }}
                                />
                                <label
                                    htmlFor="copy-all"
                                    className="text-sm font-bold leading-none"
                                >
                                    Select All
                                </label>
                            </div>
                            <Separator />
                        </>
                    )}
                    {allUniqueItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`copy-${item.id}`}
                                checked={itemsToCopy.some(i => i.id === item.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setItemsToCopy(prev => [...prev, item]);
                                    } else {
                                        setItemsToCopy(prev => prev.filter(i => i.id !== item.id));
                                    }
                                }}
                            />
                            <label htmlFor={`copy-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {item.name} ({item.quantity} - ₹{item.price})
                            </label>
                        </div>
                    ))}
                    {allUniqueItems.length === 0 && <p className="text-muted-foreground text-center">No other items to copy.</p>}
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCopyItemsOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmCopy} disabled={itemsToCopy.length === 0}>
                    Add {itemsToCopy.length > 0 ? itemsToCopy.length : ''} Selected Item(s)
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
