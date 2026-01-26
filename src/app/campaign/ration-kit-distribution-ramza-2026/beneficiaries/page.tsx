'use client';
import { useState } from 'react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { BeneficiaryForm, type BeneficiaryFormData } from '@/components/beneficiary-form';

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
    'General': [
        { id: 'General-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' },
        { id: 'General-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' },
        { id: 'General-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' },
        { id: 'General-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' },
        { id: 'General-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' },
        { id: 'General-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' },
        { id: 'General-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' },
        { id: 'General-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' },
        { id: 'General-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' },
        { id: 'General-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' },
        { id: 'General-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' },
        { id: 'General-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },
    ],
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

const initialBeneficiaries = [
    {
        id: '1',
        name: 'Saleem Khan',
        address: '123, Old City, Hyderabad',
        phone: '9876543210',
        members: 5,
        earningMembers: 1,
        male: 2,
        female: 3,
        addedDate: '2026-03-15',
        idProofType: 'Aadhaar',
        idNumber: 'XXXX XXXX 1234',
        referralBy: 'Local NGO',
        kitAmount: 2058,
        status: 'Given' as const,
    },
    {
        id: '2',
        name: 'Aisha Begum',
        address: '456, New Town, Hyderabad',
        phone: '9876543211',
        members: 4,
        earningMembers: 2,
        male: 2,
        female: 2,
        addedDate: '2026-03-16',
        idProofType: 'PAN',
        idNumber: 'ABCDE1234F',
        referralBy: 'Masjid Committee',
        kitAmount: 1000,
        status: 'Pending' as const,
    },
    {
        id: '3',
        name: 'Mohammed Ali',
        address: '789, Charminar, Hyderabad',
        phone: '9876543212',
        members: 6,
        earningMembers: 1,
        male: 3,
        female: 3,
        addedDate: '2026-03-17',
        idProofType: 'Other',
        idNumber: 'Voter ID',
        referralBy: 'Self',
        kitAmount: 2058,
        status: 'Hold' as const,
    },
    {
        id: '4',
        name: 'Fatima Sheikh',
        address: '101, Golconda, Hyderabad',
        phone: '9876543213',
        members: 3,
        earningMembers: 0,
        male: 1,
        female: 2,
        addedDate: '2026-03-18',
        idProofType: 'Aadhaar',
        idNumber: 'YYYY YYYY 5678',
        referralBy: 'Local NGO',
        kitAmount: 696,
        status: 'Need More Details' as const,
    },
];

export type Beneficiary = (typeof initialBeneficiaries)[number];

export default function BeneficiariesPage() {
  const campaignId = 'ration-kit-distribution-ramza-2026';
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<string | null>(null);
  const [rationLists] = useState<RationList>(initialRationLists);

  const handleAdd = () => {
    setEditingBeneficiary(null);
    setIsFormOpen(true);
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setBeneficiaryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (beneficiaryToDelete) {
      setBeneficiaries(beneficiaries.filter(b => b.id !== beneficiaryToDelete));
      setBeneficiaryToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleFormSubmit = (data: BeneficiaryFormData) => {
    if (editingBeneficiary) {
      setBeneficiaries(beneficiaries.map(b => b.id === editingBeneficiary.id ? { ...editingBeneficiary, ...data } : b));
    } else {
      const newBeneficiary: Beneficiary = {
        ...data,
        id: Date.now().toString(),
        addedDate: new Date().toISOString().split('T')[0],
      };
      setBeneficiaries([...beneficiaries, newBeneficiary]);
    }
    setIsFormOpen(false);
  };

  const totalKitAmount = beneficiaries.reduce((acc, b) => acc + b.kitAmount, 0);

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
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary">
                <Link href={`/campaign/${campaignId}`}>Ration Details</Link>
            </Button>
            <Button variant="ghost" asChild className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-primary" data-active="true">
                <Link href={`/campaign/${campaignId}/beneficiaries`}>Beneficiary List</Link>
            </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Beneficiary List 2026</CardTitle>
            <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Beneficiary
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[50px] text-center">Actions</TableHead>
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
                      {beneficiaries.map((beneficiary, index) => (
                          <TableRow key={beneficiary.id}>
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
                  </TableBody>
                  <TableFoot>
                    <TableRow>
                        <TableCell colSpan={12} className="text-right font-bold">Total Kit Amount Required</TableCell>
                        <TableCell className="text-right font-bold">₹{totalKitAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                  </TableFoot>
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
                rationLists={rationLists}
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
    </div>
  );
}
