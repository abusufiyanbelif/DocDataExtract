'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, errorEmitter, FirestorePermissionError, type SecurityRuleContext, useStorage } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { deleteDoc, doc } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, MoreHorizontal, PlusCircle, Trash2, ShieldAlert, UserCheck, UserX } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection } from 'firebase/firestore';
import { deleteObject, ref as storageRef } from 'firebase/storage';

export default function UsersPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const usersCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const canCreate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.create;
  const canUpdate = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.update;
  const canDelete = userProfile?.role === 'Admin' || !!userProfile?.permissions?.users?.delete;

  const handleAdd = () => {
    if (!canCreate) return;
    router.push('/users/create');
  };

  const handleEdit = (user: UserProfile) => {
    if (!canUpdate) return;
    router.push(`/users/edit/${user.id}`);
  };

  const handleDeleteClick = (id: string) => {
    if (!canDelete) return;
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleToggleStatus = (userToUpdate: UserProfile) => {
    if (!firestore || !canUpdate) return;
    if (userToUpdate.userKey === 'admin') {
        toast({ title: 'Action Forbidden', description: 'The default admin user cannot be deactivated.', variant: 'destructive' });
        return;
    }
    if (userToUpdate.id === userProfile?.id) {
        toast({ title: 'Action Forbidden', description: 'You cannot deactivate your own account.', variant: 'destructive' });
        return;
    }

    const newStatus = userToUpdate.status === 'Active' ? 'Inactive' : 'Active';
    const docRef = doc(firestore, 'users', userToUpdate.id);
    const updatedData = { status: newStatus };

    updateDoc(docRef, updatedData)
        .then(() => {
            toast({ title: 'Success', description: `${userToUpdate.name}'s account is now ${newStatus}.` });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete || !firestore || !storage) return;

    const userBeingDeleted = users.find(u => u.id === userToDelete);
    if (!userBeingDeleted) return;

    if (userBeingDeleted?.userKey === 'admin') {
        toast({ title: 'Action Forbidden', description: 'The default admin user cannot be deleted.', variant: 'destructive' });
        setUserToDelete(null);
        setIsDeleteDialogOpen(false);
        return;
    }

    const docRef = doc(firestore, 'users', userToDelete);

    const deleteFilePromise = userBeingDeleted.idProofUrl
        ? deleteObject(storageRef(storage, userBeingDeleted.idProofUrl))
        : Promise.resolve();

    deleteFilePromise.catch(error => {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Could not delete associated file from storage:", error);
            toast({
                title: "File Deletion Warning",
                description: "Could not remove the associated ID proof file. It may need to be removed manually.",
                variant: 'destructive',
                duration: 7000
            });
        }
    });
    
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Success', description: 'The user has been successfully deleted.' });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });

    setUserToDelete(null);
    setIsDeleteDialogOpen(false);
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
  
  if (userProfile?.role !== 'Admin' && !userProfile?.permissions?.users?.read) {
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
            {canCreate && (
              <div className="flex items-center gap-2">
                  <Button onClick={handleAdd} disabled={areUsersLoading}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add User
                  </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          {(canUpdate || canDelete) && <TableHead className="w-[50px] text-center">Actions</TableHead>}
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
                              {(canUpdate || canDelete) && (
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {canUpdate && (
                                              <DropdownMenuItem onClick={() => handleEdit(user)} className="cursor-pointer">
                                                  <Edit className="mr-2 h-4 w-4" />
                                                  Edit
                                              </DropdownMenuItem>
                                            )}
                                            {canUpdate && canDelete && <DropdownMenuSeparator />}
                                            {canUpdate && user.status === 'Active' ? (
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} disabled={user.userKey === 'admin' || user.id === userProfile?.id} className="cursor-pointer">
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    Deactivate
                                                </DropdownMenuItem>
                                            ) : canUpdate ? (
                                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="cursor-pointer">
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Activate
                                                </DropdownMenuItem>
                                            ) : null}
                                            {canDelete && (
                                              <DropdownMenuItem onClick={() => handleDeleteClick(user.id)} disabled={user.userKey === 'admin' || user.id === userProfile?.id} className="text-destructive focus:bg-destructive/20 focus:text-destructive cursor-pointer">
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  Delete
                                              </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                              )}
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
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account profile. The authentication account will remain but will be inaccessible.
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
