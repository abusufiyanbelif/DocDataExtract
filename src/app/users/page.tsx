'use client';
import { useState } from 'react';
import { DocuExtractHeader } from '@/components/docu-extract-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { UserForm, type UserFormData } from '@/components/user-form';
import { useToast } from '@/hooks/use-toast';
import { initialUsers, type User as UserType } from '@/lib/users';

export type User = Omit<UserType, 'password'>;


export default function UsersPage() {
  // We remove password from the state
  const [users, setUsers] = useState<User[]>(initialUsers.map(({password, ...rest}) => rest));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAdd = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete));
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
      toast({ title: 'User Deleted', description: 'The user has been successfully deleted.' });
    }
  };
  
  const handleFormSubmit = (data: UserFormData) => {
    const isNew = !editingUser;
    
    if (users.some(u => u.userKey === data.userKey && u.id !== editingUser?.id)) {
        toast({
            title: 'User Key Exists',
            description: 'This User Key is already taken. Please choose another one.',
            variant: 'destructive',
        });
        return;
    }
    
    // In a real app, you would handle password updates securely.
    // Here we just use the user data for the UI.
    const { password, ...userData } = data;

    if (isNew) {
      const newUser: User = {
        id: Date.now().toString(),
        name: userData.name,
        phone: userData.phone,
        userKey: userData.userKey,
        role: userData.role,
      };
      setUsers([...users, newUser]);
      toast({ title: 'User Added', description: 'A new user has been successfully added.' });
    } else {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
      toast({ title: 'User Updated', description: 'The user details have been successfully updated.' });
    }
    setIsFormOpen(false);
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
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
                          <TableHead>Phone</TableHead>
                          <TableHead>User Key</TableHead>
                          <TableHead>Role</TableHead>
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
                    This action cannot be undone. This will permanently delete the user account.
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
