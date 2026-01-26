'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { modules, permissions } from '@/lib/modules';

import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, Loader2, ShieldAlert, UserCheck, UserX } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const usersCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const handleToggleStatus = async (userToUpdate: UserProfile) => {
    if (!firestore || !userProfile || userProfile.role !== 'Admin') return;
    if (userToUpdate.userKey === 'admin') {
        toast({ title: 'Action Forbidden', description: 'The default admin user cannot be deactivated.', variant: 'destructive' });
        return;
    }
    if (userToUpdate.id === userProfile.id) {
        toast({ title: 'Action Forbidden', description: 'You cannot deactivate your own account.', variant: 'destructive' });
        return;
    }

    const newStatus = userToUpdate.status === 'Active' ? 'Inactive' : 'Active';
    const docRef = doc(firestore, 'users', userToUpdate.id);
    try {
        await updateDoc(docRef, { status: newStatus });
        toast({ title: 'Success', description: `${userToUpdate.name}'s account is now ${newStatus}.` });
    } catch (error) {
        console.error("Error updating status:", error);
        toast({ title: 'Error', description: 'Could not update user status.', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete && firestore) {
        const docRef = doc(firestore, 'users', userToDelete);
        try {
            await deleteDoc(docRef);
            toast({ title: 'Success', description: 'The user has been successfully deleted.' });
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
    if (!firestore) {
        toast({ title: 'Error', description: 'Database connection not available.', variant: 'destructive' });
        return;
    };
    setIsSubmitting(true);
    
    // For new users, check if loginId already exists
    if (!editingUser && users.some(u => u.loginId === data.loginId)) {
        toast({
            title: 'Login ID Exists',
            description: 'This Login ID is already taken. Please choose another one.',
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }
    
    const { password, ...userData } = data;

    if (userData.role === 'Admin') {
        const allPermissions: any = {};
        for (const mod of modules) {
            allPermissions[mod.id] = {};
            for (const perm of permissions) {
                allPermissions[mod.id][perm] = true;
            }
        }
        userData.permissions = allPermissions;
    }

    try {
        if (editingUser) {
            const docRef = doc(firestore, 'users', editingUser.id);
            // Don't update userKey or loginId for existing users
            const { userKey, loginId, ...updateData } = userData;
            await updateDoc(docRef, updateData as any);
            toast({ title: 'Success', description: 'User details have been successfully updated.' });
        } else {
            await addDoc(collection(firestore, 'users'), {
                ...userData,
                createdAt: serverTimestamp()
            });
            toast({ 
                title: 'Success', 
                description: `User '${data.name}' created. Manually create auth user with email '${data.userKey}@docdataextract.app' and password '${data.password}'.`
            });
        }
        setIsFormOpen(false);
        setEditingUser(null);
    } catch (error: any) {
        console.error("Error saving user:", error);
        toast({ title: 'Error', description: error.message || 'Could not save user.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = areUsersLoading || isProfileLoading;
  
  if (isLoading) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <DocuExtractHeader />
            <main className="container mx-auto p-4 md:p-8">
                <Card>
                    <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </main>
        </div>
    )
  }
  
  if (userProfile?.role !== 'Admin') {
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
                    You do not have the required permissions to manage users.
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
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center gap-2">
                <Button onClick={handleAdd} disabled={areUsersLoading}>
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
                          <TableHead>Login ID</TableHead>
                          <TableHead>User Key</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {users.map((user, index) => (
                          <TableRow key={user.id}>
                              <TableCell className="text-center">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleEdit(user)} className="cursor-pointer">
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                            {user.status === 'Active' ? (
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} disabled={user.userKey === 'admin' || user.id === userProfile?.id} className="cursor-pointer">
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Deactivate
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="cursor-pointer">
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Activate
                                                </DropdownMenuItem>
                                            )}
                                          <DropdownMenuItem onClick={() => handleDeleteClick(user.id)} disabled={user.userKey === 'admin' || user.id === userProfile?.id} className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer">
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.phone}</TableCell>
                              <TableCell>{user.loginId}</TableCell>
                              <TableCell>{user.userKey}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>{user.status}</Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No users found. The database may be empty.
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit' : 'Add'} User</DialogTitle>
            </DialogHeader>
            <UserForm
                user={editingUser}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                isSubmitting={isSubmitting}
                isLoading={areUsersLoading}
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
