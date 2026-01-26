'use client';

import { useState } from 'react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Download } from 'lucide-react';
import Link from 'next/link';

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
  
  const handleDownload = () => {
    let csvContent = 'Member Count,Item Name,Quantity,Price (₹),Notes\n';

    Object.entries(rationLists).forEach(([memberCount, items]) => {
      items.forEach(item => {
        const row = [
          memberCount,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.quantity.replace(/"/g, '""')}"`,
          item.price,
          `"${item.notes.replace(/"/g, '""')}"`
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
  };


  const renderRationTable = (memberCount: string) => {
    const items = rationLists[memberCount];
    const total = calculateTotal(items);

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Item Name</TableHead>
                  <TableHead className="w-[15%]">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[120px] text-right">Price (₹)</TableHead>
                  <TableHead className="w-[50px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
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
                  <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
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
             <div className="flex justify-between items-start">
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
                <Button onClick={handleDownload} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Prices
                </Button>
             </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="5" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="5">For 5 Members</TabsTrigger>
                <TabsTrigger value="3">For 3 Members</TabsTrigger>
                <TabsTrigger value="2">For 2 Members</TabsTrigger>
                <TabsTrigger value="1">For 1 Member</TabsTrigger>
              </TabsList>
              <TabsContent value="5" className="mt-4">{renderRationTable('5')}</TabsContent>
              <TabsContent value="3" className="mt-4">{renderRationTable('3')}</TabsContent>
              <TabsContent value="2" className="mt-4">{renderRationTable('2')}</TabsContent>
              <TabsContent value="1" className="mt-4">{renderRationTable('1')}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
