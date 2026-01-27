'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, type SecurityRuleContext } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, updateDoc } from 'firebase/firestore';
import type { Campaign, RationItem } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Download, Loader2, Edit, Save } from 'lucide-react';
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

export default function CampaignDetailsPage() {
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

  const [editMode, setEditMode] = useState(false);
  const [editableCampaign, setEditableCampaign] = useState<Campaign | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newMemberCount, setNewMemberCount] = useState('');

  useEffect(() => {
    if (campaign) {
      setEditableCampaign(JSON.parse(JSON.stringify(campaign))); // Deep copy
    }
  }, [campaign]);
  
  // Reset local state if edit mode is cancelled
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
    
    const saveData = { ...editableCampaign };
    
    updateDoc(campaignDocRef, saveData)
        .then(() => {
            toast({ title: 'Success', description: 'Campaign details saved.' });
            setEditMode(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: campaignDocRef.path,
                operation: 'update',
                requestResourceData: saveData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
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

                tableBody.push([
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

  const renderRationTable = (memberCount: string) => {
    const items = editableCampaign?.rationLists?.[memberCount] || [];
    const total = calculateTotal(items);

    return (
      <Card>
        <CardContent className="pt-6">
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
                        onChange={e => handleItemChange(memberCount, item.id, 'price', Number(e.target.value))}
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
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">₹{total.toFixed(2)}</TableCell>
                  {canUpdate && editMode && <TableCell></TableCell>}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          {canUpdate && editMode && (
            <div className="mt-4 flex justify-end">
                <Button onClick={() => handleAddItem(memberCount)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  if (isLoading || !editableCampaign) {
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
                  <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
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
                    <CardTitle>Ration Details</CardTitle>
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
                    {canUpdate && editMode && (
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
            {memberCategories.length > 0 ? (
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
