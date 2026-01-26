'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, Database } from 'lucide-react';
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
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { userProfile: currentUserProfile, isLoading: isCurrentUserLoading } = useUserProfile();
  const [isSeeding, setIsSeeding] = useState(false);

  const usersCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  
  const { data: users, isLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete && firestore) {
        const docRef = doc(firestore, 'users', userToDelete);
        try {
            await deleteDoc(docRef);
            toast({ title: 'User Deleted', description: 'The user has been successfully deleted.' });
        } catch(error) {
            console.error("Error deleting user:", error);
            toast({ title: 'Error', description: 'Could not delete user.', variant: 'destructive' });
        } finally {
            setUserToDelete(null);
            setIsDeleteDialogOpen(false);
        }
    }
  };
  
  const handleFormSubmit = async (data: UserFormData) => {
    if (!firestore) return;
    
    if (!editingUser && users.some(u => u.userKey === data.userKey)) {
        toast({
            title: 'User Key Exists',
            description: 'This User Key is already taken. Please choose another one.',
            variant: 'destructive',
        });
        return;
    }
    
    const { password, ...userData } = data;

    try {
        if (editingUser) {
            const docRef = doc(firestore, 'users', editingUser.id);
            await updateDoc(docRef, userData);
            toast({ title: 'User Updated', description: 'The user details have been successfully updated.' });
        } else {
            await addDoc(collection(firestore, 'users'), {
                ...userData,
                createdAt: serverTimestamp()
            });
            toast({ 
                title: 'User Profile Added', 
                description: `IMPORTANT: To log in as '${data.userKey}', you must now manually create this user in Firebase Authentication with the email '${data.userKey}@docdataextract.app' and the password you set.`
            });
        }
    } catch (error) {
        console.error("Error saving user:", error);
        toast({ title: 'Error', description: 'Could not save user.', variant: 'destructive' });
    } finally {
        setIsFormOpen(false);
        setEditingUser(null);
    }
  };

  const handleSeedDatabase = async () => {
    if (!firestore) {
        toast({ title: 'Error', description: 'Firestore not available.', variant: 'destructive' });
        return;
    }
    setIsSeeding(true);

    try {
        const batch = writeBatch(firestore);

        const adminUserDocRef = doc(collection(firestore, 'users'));
        batch.set(adminUserDocRef, {
            name: 'Admin User',
            phone: '0000000000',
            userKey: 'admin',
            role: 'Admin',
        });
        
        const sampleUserDocRef = doc(collection(firestore, 'users'));
        batch.set(sampleUserDocRef, {
            name: 'Sample User',
            phone: '1111111111',
            userKey: 'sampleuser',
            role: 'User',
        });

        const campaignId = 'ration-kit-distribution-ramza-2026';
        const campaignRef = doc(firestore, 'campaigns', campaignId);
        
        const initialRationLists = {
            'General': [{ id: 'General-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: 'General-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: 'General-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: 'General-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: 'General-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: 'General-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: 'General-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: 'General-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: 'General-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: 'General-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: 'General-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: 'General-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
            '5': [{ id: '5-1', name: 'Rice', quantity: '10 kg', price: 600, notes: '@60/kg' }, { id: '5-2', name: 'Wheat flour', quantity: '5 kg', price: 250, notes: 'Ashirvad' }, { id: '5-3', name: 'Tea', quantity: '250 gm', price: 100, notes: 'Society mix' }, { id: '5-4', name: 'Sugar', quantity: '2 kg', price: 88, notes: '@44/kg' }, { id: '5-5', name: 'Groundnuts', quantity: '500 gm', price: 60, notes: '' }, { id: '5-6', name: 'Khopra', quantity: '500 gm', price: 180, notes: '' }, { id: '5-7', name: 'Tur Dal', quantity: '1 kg', price: 120, notes: '' }, { id: '5-8', name: 'Masoor Dal', quantity: '1 kg', price: 90, notes: '' }, { id: '5-9', name: 'Khimya Dates', quantity: '', price: 150, notes: '' }, { id: '5-10', name: 'Edible Palm Oil', quantity: '2 packet', price: 220, notes: '' }, { id: '5-11', name: 'Garam Masala', quantity: '150 gm', price: 180, notes: '' }, { id: '5-12', name: 'Captain Cook Salt', quantity: '', price: 20, notes: '' },],
            '3': [{ id: '3-1', name: 'Rice', quantity: '6 kg', price: 360, notes: '@60/kg' }, { id: '3-2', name: 'Wheat flour', quantity: '3 kg', price: 150, notes: 'Ashirvad' }, { id: '3-3', name: 'Tea', quantity: '150 gm', price: 60, notes: 'Society mix' }, { id: '3-4', name: 'Sugar', quantity: '1.5 kg', price: 66, notes: '@44/kg' }, { id: '3-5', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
            '2': [{ id: '2-1', name: 'Rice', quantity: '4 kg', price: 240, notes: '@60/kg' }, { id: '2-2', name: 'Wheat flour', quantity: '2 kg', price: 100, notes: 'Ashirvad' }, { id: '2-3', name: 'Sugar', quantity: '1 kg', price: 44, notes: '@44/kg' }, { id: '2-4', name: 'Edible Palm Oil', quantity: '1 packet', price: 110, notes: '' },],
            '1': [{ id: '1-1', name: 'Rice', quantity: '2 kg', price: 120, notes: '@60/kg' }, { id: '1-2', name: 'Wheat flour', quantity: '1 kg', price: 50, notes: 'Ashirvad' }, { id: '1-3', name: 'Sugar', quantity: '0.5 kg', price: 22, notes: '@44/kg' },],
        };
        
        batch.set(campaignRef, {
            name: 'Ration Kit Distribution Ramza 2026',
            status: 'Active',
            priceDate: '2025-01-11',
            shopName: 'Example Kirana Store',
            shopContact: '1234567890',
            shopAddress: '123 Main St, Hyderabad',
            rationLists: initialRationLists,
            createdAt: serverTimestamp(),
        });

        const initialBeneficiaries = [
            { id: '1', name: 'Saleem Khan', address: '123, Old City, Hyderabad', phone: '9876543210', members: 5, earningMembers: 1, male: 2, female: 3, addedDate: '2026-03-15', idProofType: 'Aadhaar', idNumber: 'XXXX XXXX 1234', referralBy: 'Local NGO', kitAmount: 2058, status: 'Given' },
            { id: '2', name: 'Aisha Begum', address: '456, New Town, Hyderabad', phone: '9876543211', members: 4, earningMembers: 2, male: 2, female: 2, addedDate: '2026-03-16', idProofType: 'PAN', idNumber: 'ABCDE1234F', referralBy: 'Masjid Committee', kitAmount: 1000, status: 'Pending' },
            { id: '3', name: 'Mohammed Ali', address: '789, Charminar, Hyderabad', phone: '9876543212', members: 6, earningMembers: 1, male: 3, female: 3, addedDate: '2026-03-17', idProofType: 'Other', idNumber: 'Voter ID', referralBy: 'Self', kitAmount: 2058, status: 'Hold' },
            { id: '4', name: 'Fatima Sheikh', address: '101, Golconda, Hyderabad', phone: '9876543213', members: 3, earningMembers: 0, male: 1, female: 2, addedDate: '2026-03-18', idProofType: 'Aadhaar', idNumber: 'YYYY YYYY 5678', referralBy: 'Local NGO', kitAmount: 696, status: 'Need More Details' },
        ];

        initialBeneficiaries.forEach((beneficiary) => {
            const { id, ...beneficiaryData } = beneficiary;
            const beneficiaryRef = doc(firestore, `campaigns/${campaignId}/beneficiaries`, id);
            batch.set(beneficiaryRef, { ...beneficiaryData, createdAt: serverTimestamp() });
        });

        await batch.commit();

        toast({
            title: 'Database Seeded',
            description: "Sample data added. IMPORTANT: To log in as 'admin' or 'sampleuser', you must create them in Firebase Authentication with emails like 'admin@docdataextract.app'.",
            duration: 9000,
        });

    } catch (error) {
        console.error('Error seeding database:', error);
        toast({ title: 'Seeding Failed', description: 'Could not seed the database. Check console for errors.', variant: 'destructive' });
    } finally {
        setIsSeeding(false);
    }
  };

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
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center gap-2">
                {currentUserProfile?.role === 'Admin' && (
                    <Button onClick={handleSeedDatabase} variant="outline" disabled={isSeeding || isCurrentUserLoading}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Seed Database
                    </Button>
                )}
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[50px] text-center">Actions</TableHead>
                          <TableHead className="w-[40px]">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>User Key</TableHead>
                          <TableHead>Role</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {(isLoading || isCurrentUserLoading) && (
                        [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                            </TableRow>
                        ))
                      )}
                      {!(isLoading || isCurrentUserLoading) && users.map((user, index) => (
                          <TableRow key={user.id}>
                              <TableCell className="text-center">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDeleteClick(user.id)} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.phone}</TableCell>
                              <TableCell>{user.userKey}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                      {!(isLoading || isCurrentUserLoading) && users.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No users found. Try seeding the database.
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
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit' : 'Add'} User</DialogTitle>
            </DialogHeader>
            <UserForm
                user={editingUser}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account profile.
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
