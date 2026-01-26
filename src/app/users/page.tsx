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


const initialUsers = [
  { id: '0', name: 'Admin', phone: '0000000000', userKey: 'admin', role: 'Admin' as const },
  { id: '1', name: 'Moosa Shaikh', phone: '8421708907', userKey: 'moosashaikh', role: 'User' as const },
  { id: '2', name: 'Maaz Shaikh', phone: '9372145889', userKey: 'maazshaikh', role: 'User' as const },
  { id: '3', name: 'Abu Rehan Bedrekar', phone: '7276224160', userKey: 'aburehanbedrekar', role: 'User' as const },
  { id: '4', name: 'Abusufiya Belief', phone: '7887646583', userKey: 'abusufiyabelief', role: 'User' as const },
  { id: '5', name: 'Nayyar Ahmed Karajgi', phone: '9028976036', userKey: 'nayyarahmedkarajgi', role: 'User' as const },
  { id: '6', name: 'Arif Baig', phone: '9225747045', userKey: 'arifbaig', role: 'User' as const },
  { id: '7', name: 'Mazhar Shaikh', phone: '8087669914', userKey: 'mazharshaikh', role: 'User' as const },
  { id: '8', name: 'Mujahid Chabukswar', phone: '8087420544', userKey: 'mujahidchabukswar', role: 'User' as const },
  { id: '9', name: 'Muddasir Bhairamadgi', phone: '7385557820', userKey: 'muddasirbhairamadgi', role: 'User' as const },
];

export type User = (typeof initialUsers)[number];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
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
    
    // Simple check for userKey uniqueness
    if (users.some(u => u.userKey === data.userKey && u.id !== editingUser?.id)) {
        toast({
            title: 'User Key Exists',
            description: 'This User Key is already taken. Please choose another one.',
            variant: 'destructive',
        });
        return;
    }

    if (isNew) {
      const newUser: User = {
        id: Date.now().toString(),
        name: data.name,
        phone: data.phone,
        userKey: data.userKey,
        role: data.role,
      };
      setUsers([...users, newUser]);
      toast({ title: 'User Added', description: 'A new user has been successfully added.' });
    } else {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...data } : u));
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
