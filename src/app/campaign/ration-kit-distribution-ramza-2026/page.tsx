'use client';

import { useState } from 'react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Download } from 'lucide-react';
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


interface RationItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  notes: string;
}

type RationList = {
  [members: string]: RationItem[];
}

const initialRationLists: RationList = {
    '5': [
        { id: '5-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' },
        { id: '5-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' },
        { id: '5-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' },
        { id: '5-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' },
        { id: '5-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' },
        { id: '5-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' },
        { id: '5-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' },
        { id: '5-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' },
        { id: '5-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' },
        { id: '5-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' },
        { id: '5-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' },
        { id: '5-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },
    ],
    '3': [
        { id: '3-1', name: 'Rice', quantity: '6 kg', price: 360, notes: '@60/kg' },
        { id: '3-2', name: 'Wheat flour', quantity: '3 kg', price: 150, notes: 'Ashirvad' },
        { id: '3-3', name: 'Tea', quantity: '150 gm', price: 60, notes: 'Society mix' },
        { id: '3-4', name: 'Sugar', quantity: '1.5 kg', price: 66, notes: '@44/kg' },
        { id: '3-5', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },
    ],
    '2': [
        { id: '2-1', name: 'Rice', quantity: '4 kg', price: 240, notes: '@60/kg' },
        { id: '2-2', name: 'Wheat flour', quantity: '2 kg', price: 100, notes: 'Ashirvad' },
        { id: '2-3', name: 'Sugar', quantity: '1 kg', price: 44, notes: '@44/kg' },
        { id: '2-4', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },
    ],
    '1': [
        { id: '1-1', name: 'Rice', quantity: '2 kg', price: 120, notes: '@60/kg' },
        { id: '1-2', name: 'Wheat flour', quantity: '1 kg', price: 50, notes: 'Ashirvad' },
        { id: '1-3', name: 'Sugar', quantity: '0.5 kg', price: 22, notes: '@44/kg' },
    ],
};


export default function CampaignDetailsPage() {
  const campaignId = 'ration-kit-distribution-ramza-2026';
  const [rationLists, setRationLists] = useState<RationList>(initialRationLists);
  const [priceDate, setPriceDate] = useState('2025-01-11');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newMemberCount, setNewMemberCount] = useState('');
  const { toast } = useToast();

  const handleItemChange = (
    memberCount: string,
    itemId: string,
    field: keyof RationItem,
    value: string | number
  ) => {
    setRationLists(prev => ({
      ...prev,
      [memberCount]: prev[memberCount].map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = (memberCount: string) => {
    const newItem: RationItem = {
      id: `${memberCount}-${Date.now()}`,
      name: '',
      quantity: '',
      price: 0,
      notes: '',
    };
    setRationLists(prev => ({
      ...prev,
      [memberCount]: [...prev[memberCount], newItem],
    }));
  };

  const handleDeleteItem = (memberCount: string, itemId: string) => {
    setRationLists(prev => ({
      ...prev,
      [memberCount]: prev[memberCount].filter(item => item.id !== itemId),
    }));
  };
  
  const calculateTotal = (items: RationItem[]) => {
    return items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  };
  
  const handleDownload = (format: 'csv' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      let csvContent = '#,Member Count,Item Name,Quantity,Price (₹),Notes\n';

      Object.entries(rationLists).forEach(([memberCount, items]) => {
        items.forEach((item, index) => {
          const row = [
            index + 1,
            memberCount,
            `"${item.name.replace(/"/g, '""')}"`,
            `"${item.quantity.replace(/"/g, '""')}"`,
            item.price,
            `"${item.notes.replace(/"/g, '""')}"`,
          ].join(',');
          csvContent += row + '\n';
        });
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ration-details-${priceDate}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
        toast({
            title: 'Coming Soon!',
            description: `The option to download as ${format.toUpperCase()} will be available shortly.`,
        });
    }
  };

  const handleAddNewCategory = () => {
    if (!newMemberCount || isNaN(Number(newMemberCount)) || Number(newMemberCount) <= 0) {
        toast({
            title: 'Invalid Input',
            description: 'Please enter a valid positive number for members.',
            variant: 'destructive',
        });
        return;
    }
    const newCountStr = String(Math.floor(Number(newMemberCount)));
    if (rationLists[newCountStr]) {
        toast({
            title: 'Category Exists',
            description: `A category for ${newCountStr} members already exists.`,
            variant: 'destructive',
        });
        return;
    }
    setRationLists(prev => ({
        ...prev,
        [newCountStr]: [],
    }));
    setNewMemberCount('');
    setIsAddCategoryOpen(false);
  };
  
  const memberCategories = Object.keys(rationLists).sort((a, b) => Number(b) - Number(a));

  const renderRationTable = (memberCount: string) => {
    const items = rationLists[memberCount] || [];
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
                  <TableHead className="w-[50px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={item.name}
                        onChange={e => handleItemChange(memberCount, item.id, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.quantity}
                        onChange={e => handleItemChange(memberCount, item.id, 'quantity', e.target.value)}
                        placeholder="e.g. 10 kg"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.notes}
                        onChange={e => handleItemChange(memberCount, item.id, 'notes', e.target.value)}
                        placeholder="e.g. @60/kg"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={e => handleItemChange(memberCount, item.id, 'price', Number(e.target.value))}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(memberCount, item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">₹{total.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFoot>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => handleAddItem(memberCount)}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <h1 className="text-3xl font-bold">Ration Kit Distribution Ramza 2026</h1>
        </div>
        
        <div className="flex gap-2 border-b mb-4">
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
            </Button>
        </div>

        <Card>
          <CardHeader>
             <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <CardTitle>Ration Details 2026</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                        <span>Price Date:</span>
                        <Input
                        type="date"
                        value={priceDate}
                        onChange={(e) => setPriceDate(e.target.value)}
                        className="w-fit"
                        />
                    </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
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
                </div>
             </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={memberCategories[0] || ''} className="w-full">
              <TabsList className="h-auto flex-wrap justify-start">
                {memberCategories.map(count => (
                    <TabsTrigger key={count} value={count}>For {count} Members</TabsTrigger>
                ))}
              </TabsList>
              {memberCategories.map(count => (
                <TabsContent key={count} value={count} className="mt-4">
                    {renderRationTable(count)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
